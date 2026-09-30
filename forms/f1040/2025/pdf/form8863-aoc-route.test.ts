import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

Deno.test("reviewed Form 8862 AOTC reinstatement reaches Form 8863 and Form 1040", async () => {
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
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<IRS8863 ");
  assertStringIncludes(bundle.xml, "<IRS8862 ");
  assertStringIncludes(bundle.xml, "<IRS1040Schedule3 ");
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 8);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-10-01-form8863-aoc/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});
