import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { schedule1aPdf } from "../../../2025/pdf/forms/deductions/additional/schedule1a/schedule1a.ts";
import { pdfReviewFixtures } from "../../../2025/pdf/review-fixtures.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

const senior = pdfReviewFixtures.find((item) =>
  item.id === "joint-senior-schedule1a"
)!;
const foreign = pdfReviewFixtures.find((item) =>
  item.id === "single-form2555-full-year-physical-presence"
)!;
const vehicle = pdfReviewFixtures.find((item) =>
  item.id === "single-reviewed-car-loan-schedule1a"
)!;
const foreignForm = structuredClone(foreign.inputs.form2555) as {
  filing_details: { foreign_wages: number };
};
foreignForm.filing_details.foreign_wages = 20_000;
const source = {
  ...senior.inputs,
  form2555: foreignForm,
  schedule1a: {
    form2555_exclusion_review: {
      no_section933_puerto_rico_excluded_income: true,
      section933_review_source_reference: "2025 residency and income review",
      form2555_source_reference: "2025 physical-presence Form 2555 review",
      no_form4563_filed: true,
      form4563_review_source_reference: "2025 possession-income review",
    },
  },
};

Deno.test("structured Form 2555 exclusion joins Schedule 1-A senior MAGI and Form 1040", async () => {
  const result = execute(buildExecutionPlan(registry), registry, source, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line11_agi, 160_000);
  assertEquals(result.pending.schedule1a.form2555_line45_exclusion, 20_000);
  assertEquals(result.pending.f1040.line13b_additional_deductions, 8_400);
  const xml = buildMefXml(
    result.pending,
    extractFilerIdentity(result.pending.f1040),
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeExclusionAmt>20000</TotalIncomeExclusionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalExclusionsDeductionAmt>20000</TotalExclusionsDeductionAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>180000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>8400</TotalAdditionalDeductionsAmt>",
  );
  const pdf = schedule1aPdf.projectFields!(
    result.pending.schedule1a,
    result.pending,
  );
  assertEquals(pdf.line1_agi, 160_000);
  assertEquals(pdf.line2b_form2555_exclusion, 20_000);
  assertEquals(pdf.line3_magi, 180_000);
  assertEquals(pdf.line38_total, 8_400);
  const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
    [];
  const bytes = await buildPdfBytes(
    result.pending,
    extractFilerIdentity(result.pending.f1040),
    ".pdf-cache",
    undefined,
    origins,
  );
  const pageCount = (await PDFDocument.load(bytes)).getPageCount();
  const reviewPath = Deno.env.get("SCHEDULE1A_2555_REVIEW_PDF");
  if (reviewPath) await Deno.writeFile(reviewPath, bytes);
  assertEquals(pageCount, origins.length);
  assertEquals(
    new Set(origins.map((page) => page.formKey)),
    new Set(["f1040", "schedule1", "schedule1a", "form2555"]),
  );
  const schema = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(schema);
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, xml);
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(path);
    }
  } catch (error) {
    throw error;
  }
  assertThrows(
    () =>
      schedule1aPdf.projectFields!({
        ...result.pending.schedule1a,
        form2555_line45_exclusion: 20_001,
      }, result.pending),
    Error,
    "matching full-year exclusion",
  );
  const changedSource = structuredClone(result.pending);
  (changedSource.form2555!.filing_details as { foreign_wages: number })
    .foreign_wages = 20_001;
  assertThrows(
    () => buildMefXml(changedSource, extractFilerIdentity(changedSource.f1040)),
    Error,
    "matching its filed amount",
  );
  assertThrows(
    () =>
      schedule1aPdf.projectFields!(changedSource.schedule1a!, changedSource),
    Error,
    "matching full-year exclusion",
  );
  const unsupportedTips = structuredClone(result.pending);
  unsupportedTips.schedule1a!.qualified_employee_tips = [{
    employee_ssn: "111223333",
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    amount: 100,
    box5_medicare_wages: 100,
    occupation_code: "101",
    source_type: "w2_box7",
  }];
  assertThrows(
    () =>
      buildMefXml(
        unsupportedTips,
        extractFilerIdentity(unsupportedTips.f1040),
      ),
    Error,
    "one supported deduction route",
  );
});

Deno.test("structured Form 2555 exclusion joins vehicle interest, senior deduction, native XML, and filled PDF", async () => {
  const combined = {
    ...structuredClone(source),
    schedule1a: {
      ...source.schedule1a,
      vehicle_loans: structuredClone(
        (vehicle.inputs.schedule1a as { vehicle_loans: unknown[] })
          .vehicle_loans,
      ),
    },
  };
  (combined.form2555.filing_details as { foreign_wages: number })
    .foreign_wages = 50_000;
  const result = execute(buildExecutionPlan(registry), registry, combined, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line11_agi, 160_000);
  assertEquals(result.pending.schedule1a.form2555_line45_exclusion, 50_000);
  assertEquals(result.pending.f1040.line13b_additional_deductions, 6_800);
  const xml = buildMefXml(
    result.pending,
    extractFilerIdentity(result.pending.f1040),
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeExclusionAmt>50000</TotalIncomeExclusionAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>210000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<CarLnIntMAGILessThrshldAmt>10000</CarLnIntMAGILessThrshldAmt>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedCarLoanInterestDedAmt>2000</QualifiedCarLoanInterestDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<EnhancedSeniorDeductionAmt>4800</EnhancedSeniorDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>6800</TotalAdditionalDeductionsAmt>",
  );
  const schema = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
  const pdf = schedule1aPdf.projectFields!(
    result.pending.schedule1a,
    result.pending,
  );
  assertEquals(pdf.line1_agi, 160_000);
  assertEquals(pdf.line2b_form2555_exclusion, 50_000);
  assertEquals(pdf.line3_magi, 210_000);
  assertEquals(pdf.line25_magi, 210_000);
  assertEquals(pdf.line30_vehicle_interest, 2_000);
  assertEquals(pdf.line37_senior, 4_800);
  assertEquals(pdf.line38_total, 6_800);
  const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
    [];
  const bytes = await buildPdfBytes(
    result.pending,
    extractFilerIdentity(result.pending.f1040),
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), origins.length);
  assertEquals(
    new Set(origins.map((page) => page.formKey)),
    new Set(["f1040", "schedule1", "schedule1a", "form2555"]),
  );
  const reviewPath = Deno.env.get("SCHEDULE1A_2555_VEHICLE_REVIEW_PDF");
  if (reviewPath) await Deno.writeFile(reviewPath, bytes);
  const changedSource = structuredClone(result.pending);
  (changedSource.form2555!.filing_details as { foreign_wages: number })
    .foreign_wages = 50_001;
  assertThrows(
    () => buildMefXml(changedSource, extractFilerIdentity(changedSource.f1040)),
    Error,
    "matching its filed amount",
  );
  assertThrows(
    () =>
      schedule1aPdf.projectFields!(changedSource.schedule1a!, changedSource),
    Error,
    "matching full-year exclusion",
  );
});
