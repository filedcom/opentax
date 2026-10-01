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

const base = pdfReviewFixtures.find((item) =>
  item.id === "single-8862-ctc-reinstatement"
)!;
const baseGeneral = base.inputs.general as Record<string, unknown>;
const baseDependent = (baseGeneral.dependents as Record<string, unknown>[])[0];
const base8812 = (base.inputs.f8812 as Record<string, unknown>[])[0];

function combinedInputs() {
  return {
    ...base.inputs,
    general: {
      ...baseGeneral,
      dependents: [{
        ...baseDependent,
        dob: "2003-06-15",
        full_time_student: true,
      }],
      prior_aotc_disallowance_review: {
        disallowed_year: 2022,
        notice_reference: "Synthetic 2022 IRS AOTC notice",
        notice_copy_reference: "Retained synthetic AOTC notice copy",
        taxpayer_ssn: "111223333",
        nonclerical_disallowance_verified: true,
        no_active_ban_verified: true,
      },
    },
    f8812: [{
      ...base8812,
      qualifying_children_count: 0,
      other_dependents_count: 1,
      credit_limit_worksheet: {
        ...(base8812.credit_limit_worksheet as Record<string, unknown>),
        schedule3_line3: 1_500,
      },
    }],
    f8862: {
      claim_ctc: true,
      ctc_disallowed_year: 2023,
      ctc_disallowance_notice_reference: "Synthetic 2023 IRS CTC notice",
      claim_aotc: true,
      aotc_disallowed_year: 2022,
      aotc_disallowance_notice_reference: "Synthetic 2022 IRS AOTC notice",
      credit_disallowance_ban_active: false,
      other_dependents: [{
        first_name: "Jamie",
        last_name: "Example",
        dependent: true,
        us_citizen_national_or_resident: true,
      }],
      aotc_students: [{
        first_name: "Jamie",
        last_name: "Example",
        eligible: true,
        credit_claimed_four_prior_years: false,
      }],
    },
    f8863: [{
      credit_type: "aoc",
      student_name: "Jamie Example",
      student_ssn: "222-33-4444",
      filer_magi: 80_000,
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
        form1098t_document_id: "1098T-2025-JAMIE",
        payment_record_ids: ["TUITION-2025-JAMIE"],
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
        first_name: "Jamie",
        last_name: "Example",
        name_control: "EXAM",
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
        form1040_line18_tax: 9_055,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: 0,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  };
}

Deno.test("reviewed ODC and AOTC amounts calculate, but notice assertions cannot authorize export", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    combinedInputs(),
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 500);
  assertEquals(result.pending.f1040.line29_refundable_aoc, 1_000);
  assertEquals(result.pending.schedule3.line3_education_credit, 1_500);
  const pending = buildPending(result.pending);
  const pdfPending = {
    f1040: pending.f1040!,
    general: pending.general!,
    f8812: pending.f8812!,
    f8863: pending.f8863!,
    schedule3: pending.schedule3!,
  };
  assertThrows(
    () => nativeForm8862.build(pending.f8862!, { pending }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  assertThrows(
    () => form8862Pdf.instances?.(pending.f8862!, base.filer, pdfPending),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  await assertRejects(
    () => buildMefBundle(pending, { filer: base.filer, attachments: [] }),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
});

Deno.test("shared ODC/AOTC claimant rejects changed exact credit amounts at Form 8862 export", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    combinedInputs(),
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = [
    {
      ...pending,
      f1040: { ...pending.f1040, line19_child_tax_credit: 501 },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line29_refundable_aoc: 900 },
    },
    {
      ...pending,
      schedule3: { ...pending.schedule3, line3_education_credit: 1_400 },
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
      "shared ODC and AOTC amounts differ",
    );
    assertThrows(
      () =>
        form8862Pdf.instances?.(pending.f8862!, base.filer, {
          f1040: altered.f1040!,
          general: altered.general!,
          f8812: altered.f8812!,
          f8863: altered.f8863!,
          schedule3: altered.schedule3!,
        }),
      Error,
      "shared ODC and AOTC amounts differ",
    );
  }
});

Deno.test("combined Form 8862 ODC/AOTC rejects altered notice and student source", () => {
  const wrongNotice = combinedInputs();
  wrongNotice.f8862.aotc_disallowance_notice_reference =
    "Different IRS AOTC notice";
  const noticeResult = execute(
    buildExecutionPlan(registry),
    registry,
    wrongNotice,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(noticeResult.diagnostics, []);
  const noticePending = buildPending(noticeResult.pending);
  assertThrows(
    () =>
      form8862Pdf.instances?.(noticePending.f8862!, base.filer, {
        f1040: noticePending.f1040!,
        general: noticePending.general!,
        f8812: noticePending.f8812!,
        f8863: noticePending.f8863!,
        schedule3: noticePending.schedule3!,
      }),
    Error,
    "matching reviewed prior IRS notice",
  );

  const wrongStudent = combinedInputs();
  wrongStudent.f8862.aotc_students[0].first_name = "Other";
  const studentResult = execute(
    buildExecutionPlan(registry),
    registry,
    wrongStudent,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(studentResult.diagnostics, []);
  const pending = buildPending(studentResult.pending);
  assertThrows(
    () =>
      form8862Pdf.instances?.(pending.f8862!, base.filer, {
        f1040: pending.f1040!,
        general: pending.general!,
        f8812: pending.f8812!,
        f8863: pending.f8863!,
        schedule3: pending.schedule3!,
      }),
    Error,
    "students and credit must reconcile",
  );

  const wrongIdentity = combinedInputs();
  wrongIdentity.f8863[0].student_ssn = "999-88-7777";
  const identityResult = execute(
    buildExecutionPlan(registry),
    registry,
    wrongIdentity,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(identityResult.diagnostics, []);
  const identityPending = buildPending(identityResult.pending);
  assertThrows(
    () =>
      form8862Pdf.instances?.(
        identityPending.f8862!,
        base.filer,
        {
          f1040: identityPending.f1040!,
          general: identityPending.general!,
          f8812: identityPending.f8812!,
          f8863: identityPending.f8863!,
          schedule3: identityPending.schedule3!,
        },
      ),
    Error,
    "shared ODC and AOTC student needs one matching dependent SSN",
  );
});
