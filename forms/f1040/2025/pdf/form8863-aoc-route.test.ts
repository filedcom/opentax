import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { form8862 as nativeForm8862 } from "../mef/forms/f8862.ts";
import { buildPending } from "../mef/pending.ts";
import { form8862Pdf } from "./forms/f8862.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

function standaloneAotcPending() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      general: {
        ...(base.inputs.general as Record<string, unknown>),
        prior_aotc_disallowance_review: {
          disallowed_year: 2023,
          notice_reference: "Synthetic 2023 IRS AOTC notice",
          notice_copy_reference: "Retained synthetic AOTC notice copy",
          taxpayer_ssn: "111223333",
          nonclerical_disallowance_verified: true,
          no_active_ban_verified: true,
        },
      },
      f8862: {
        claim_aotc: true,
        aotc_disallowed_year: 2023,
        aotc_disallowance_notice_reference: "Synthetic 2023 IRS AOTC notice",
        credit_disallowance_ban_active: false,
        aotc_students: [{
          first_name: "Student",
          last_name: "Test",
          eligible: true,
          credit_claimed_four_prior_years: false,
        }],
      },
      f8863: [{
        credit_type: "aoc",
        student_name: "Student Test",
        student_ssn: "222-33-4444",
        filer_magi: 75_000,
        filing_status: FilingStatus.Single,
        aoc_adjusted_expenses: 4_000,
        aoc_claimed_4_prior_years: false,
        enrolled_half_time: true,
        completed_4_years_postsec: false,
        felony_drug_conviction: false,
        taxpayer_under_24_no_refundable_aoc: false,
        education_expense_workpaper: {
          form1098t_box1_payments: 4_000,
          form1098t_box5_scholarships: 0,
          form1098t_document_id: "1098T-2025-STUDENT",
          payment_record_ids: ["TUITION-2025-STUDENT"],
          paid_tuition_required_fees: 4_000,
          paid_course_materials_to_institution: 0,
          paid_course_materials_elsewhere: 0,
          outside_materials_needed_for_course: false,
          institution_materials_required_for_enrollment: false,
          tax_free_assistance_applied_to_expenses: 0,
          qualified_expense_refunds: 0,
          expenses_used_for_other_tax_benefits: 0,
        },
        filing_details: {
          first_name: "Student",
          last_name: "Test",
          name_control: "TEST",
          institutions: [{
            name: "Test University",
            us_address: {
              line1: "1 College Way",
              city: "Austin",
              state: "TX",
              zip: "78701",
            },
            current_year_1098t_received: true,
            prior_year_1098t_received: false,
            ein: "12-3456789",
          }],
        },
      }],
      f8863_credit_limit_worksheet: {
        credit_limit_worksheet: {
          form1040_line18_tax: 7_955,
          schedule3_line1_foreign_tax_credit: 0,
          schedule3_line2_dependent_care_credit: 0,
          schedule3_line6d: 0,
          schedule3_line6l: 0,
        },
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line18_total_tax_before_credits, 7_955);
  assertEquals(result.pending.f1040.line29_refundable_aoc, 1_000);
  assertEquals(result.pending.schedule3.line3_education_credit, 1_500);
  return buildPending(result.pending);
}

Deno.test("reviewed AOTC credit calculates, but notice assertions cannot authorize export", async () => {
  const pending = standaloneAotcPending();
  assertThrows(
    () => nativeForm8862.build(pending.f8862!, { pending }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  assertThrows(
    () =>
      form8862Pdf.instances?.(pending.f8862!, base.filer, {
        f1040: pending.f1040!,
        general: pending.general!,
        f8863: pending.f8863!,
        schedule3: pending.schedule3!,
      }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer: base.filer, attachments: [] }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("standalone AOTC rejects altered student identity and exact credit amounts in both exports", () => {
  const pending = standaloneAotcPending();
  const form8863 = pending.f8863!;
  const student = form8863.f8863s[0];
  const changed = [
    {
      ...pending,
      f1040: { ...pending.f1040, line29_refundable_aoc: 999 },
    },
    {
      ...pending,
      schedule3: { ...pending.schedule3, line3_education_credit: 1_499 },
    },
    {
      ...pending,
      f8863: { ...form8863, form8862_filed: false },
    },
    {
      ...pending,
      f8863: {
        ...form8863,
        f8863s: [{ ...student, student_name: "Different Student" }],
      },
    },
    {
      ...pending,
      f8863: {
        ...form8863,
        f8863s: [{
          ...student,
          filing_details: {
            ...student.filing_details!,
            first_name: "Different",
          },
        }],
      },
    },
  ];
  for (const altered of changed) {
    assertThrows(
      () =>
        nativeForm8862.build(pending.f8862!, {
          filer: base.filer,
          pending: altered,
        }),
      Error,
    );
    assertThrows(
      () =>
        form8862Pdf.instances?.(pending.f8862!, base.filer, {
          f1040: altered.f1040!,
          general: altered.general!,
          f8863: altered.f8863!,
          schedule3: altered.schedule3!,
        }),
      Error,
    );
  }
});
