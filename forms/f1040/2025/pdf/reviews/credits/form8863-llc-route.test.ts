import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { inputSchema as form8863InputSchema } from "../../../../nodes/inputs/f8863/index.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { form8863 as nativeForm8863 } from "../../../mef/forms/credits/f8863.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../builder.ts";
import { form8863Pdf } from "../../forms/credits/f8863.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

function lifetimeLearningReturn() {
  return execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f8863: [{
      credit_type: "llc",
      student_name: "Alex Example",
      student_ssn: base.filer.primarySSN,
      filer_magi: 75_000,
      filing_status: FilingStatus.Single,
      llc_adjusted_expenses: 7_500,
      aoc_claimed_4_prior_years: false,
      education_expense_workpaper: {
        form1098t_box1_payments: 8_000,
        form1098t_box5_scholarships: 1_000,
        form1098t_document_id: "1098T-2025-LLC-STUDENT",
        payment_record_ids: ["TUITION-2025-LLC", "BOOKS-2025-LLC"],
        paid_tuition_required_fees: 8_000,
        paid_course_materials_to_institution: 500,
        institution_materials_requirement_record_id:
          "COURSE-2025-LLC-REQUIRED-BOOKS",
        institution_materials_payment_record_id: "BOOKS-2025-LLC",
        paid_course_materials_elsewhere: 0,
        outside_materials_needed_for_course: false,
        institution_materials_required_for_enrollment: true,
        tax_free_assistance_applied_to_expenses: 1_000,
        qualified_expense_refunds: 0,
        expenses_used_for_other_tax_benefits: 0,
      },
      filing_details: {
        first_name: "Alex",
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
        form1040_line18_tax: 7_955,
        schedule3_line1_foreign_tax_credit: 0,
        schedule3_line2_dependent_care_credit: 0,
        schedule3_line6d: 0,
        schedule3_line6l: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("sourced LLC tuition, required materials, and scholarship reconcile to Schedule 3, native MeF, and PDF", async () => {
  const result = lifetimeLearningReturn();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line18_total_tax_before_credits, 7_955);
  assertEquals(result.pending.f1040.line29_refundable_aoc ?? 0, 0);
  assertEquals(result.pending.schedule3.line3_education_credit, 1_500);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<TotalQualifiedExpensesAmt>7500</TotalQualifiedExpensesAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<NonrefundableEducationCrAmt>1500</NonrefundableEducationCrAmt>",
  );
  const [projected] = form8863Pdf.instances!(
    pending.f8863!,
    base.filer,
    {
      f1040: pending.f1040!,
      schedule3: pending.schedule3!,
    },
  );
  assertEquals(projected.pdf_line31, 7_500);
  assertEquals(projected.line19, 1_500);
  assertEquals(projected.line8 ?? 0, 0);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() > 0, true);
  const source = form8863InputSchema.parse(pending.f8863);
  const workpaper = source.f8863s[0].education_expense_workpaper!;
  const changedSource = {
    ...pending,
    f8863: form8863InputSchema.parse({
      ...source,
      f8863s: [{
        ...source.f8863s[0],
        education_expense_workpaper: {
          ...workpaper,
          form1098t_box5_scholarships: 1_200,
        },
      }],
    }),
  };
  assertThrows(() =>
    nativeForm8863.build(changedSource.f8863, {
      pending: changedSource,
      filer: base.filer,
    }), Error);
  assertThrows(
    () =>
      form8863Pdf.instances!(changedSource.f8863, base.filer, {
        f1040: changedSource.f1040!,
        schedule3: changedSource.schedule3!,
      }),
    Error,
  );
  const missingRequirement = {
    ...pending,
    f8863: form8863InputSchema.parse({
      ...source,
      f8863s: [{
        ...source.f8863s[0],
        education_expense_workpaper: {
          ...workpaper,
          institution_materials_requirement_record_id: undefined,
        },
      }],
    }),
  };
  assertThrows(
    () =>
      nativeForm8863.build(missingRequirement.f8863, {
        pending: missingRequirement,
        filer: base.filer,
      }),
    Error,
    "separate enrollment requirement",
  );
  assertThrows(
    () =>
      form8863Pdf.instances!(
        missingRequirement.f8863,
        base.filer,
        {
          f1040: missingRequirement.f1040!,
          schedule3: missingRequirement.schedule3!,
        },
      ),
    Error,
    "separate enrollment requirement",
  );
  assertThrows(() =>
    nativeForm8863.build(pending.f8863!, {
      pending: {
        ...pending,
        schedule3: { ...pending.schedule3, line3_education_credit: 1_499 },
      },
      filer: base.filer,
    }), Error);
});
