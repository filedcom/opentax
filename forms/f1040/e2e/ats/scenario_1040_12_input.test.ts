import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../2025/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { w2 as nativeW2 } from "../../2025/mef/forms/income/other/w2.ts";
import { scheduleC } from "../../2025/mef/forms/income/business/schedule_c.ts";
import { scheduleSE } from "../../2025/mef/forms/taxes/self-employment/schedule_se.ts";
import { scheduleCPdf } from "../../2025/pdf/forms/income/business/schedule_c.ts";
import { scheduleSePdf } from "../../2025/pdf/forms/taxes/self-employment/schedule_se.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import {
  scenario104012PartialInput,
  SCENARIO_1040_12_RECONCILIATION,
} from "./scenario_1040_12_input.ts";
import { SCENARIO_1040_12_FACTS } from "./ty2025_cases.ts";

Deno.test("ATS 1040 Scenario 12 public wage and business inputs reconcile Schedule C and SE with Form 1040", async () => {
  const result = f1040_2025.executeReturn(scenario104012PartialInput());
  assertEquals(result.diagnostics, []);
  const p = result.pending;
  assertEquals(p.f1040?.line1a_wages, 100_836);
  assertEquals(p.f1040?.line25a_w2_withheld, 14_444);
  assertEquals(p.schedule1?.line3_schedule_c, 24_328);
  assertEquals(p.f1040?.line8_additional_income, 24_328);
  assertEquals(p.f1040?.line9_total_income, 125_164);
  assertEquals(p.schedule2?.line4_se_tax, 3_438);
  assertEquals(p.schedule1?.line15_se_deduction, 1_719);
  const filer = extractFilerIdentity(p.f1040)!;
  const context = { filer, pending: p };
  const [w2] = nativeW2.build(p.w2, context);
  assertStringIncludes(w2, "<WagesAmt>100836</WagesAmt>");
  assertStringIncludes(w2, "<WithholdingAmt>14444</WithholdingAmt>");
  const [business] = scheduleC.build(p.schedule_c, context);
  assertStringIncludes(
    business,
    "<NetProfitOrLossAmt>24328</NetProfitOrLossAmt>",
  );
  const seOutput = scheduleSE.build(p.schedule_se, context);
  const se = typeof seOutput === "string" ? seOutput : seOutput.join("");
  assertStringIncludes(se, "<SelfEmploymentTaxAmt>3438</SelfEmploymentTaxAmt>");
  assertStringIncludes(
    se,
    "<DeductibleSelfEmploymentTaxAmt>1719</DeductibleSelfEmploymentTaxAmt>",
  );
  const cFields = scheduleCPdf.projectFields!(p.schedule_c, p);
  const seFields = scheduleSePdf.projectFields!(p.schedule_se, p);
  assertEquals(seFields.line9, 70_222);
  assertEquals(seFields.line12, 3_438);
  assertEquals(seFields.line13, 1_719);
  const [cCopy] = scheduleCPdf.instances!(cFields, filer);
  assertEquals(cCopy.line28, 10_907);
  assertEquals(cCopy.line31, 24_328);
  const cPdf = await fillFormPdf(scheduleCPdf, cCopy, filer, ".pdf-cache", p);
  const sePdf = await fillFormPdf(
    scheduleSePdf,
    seFields,
    filer,
    ".pdf-cache",
    p,
  );
  assertEquals((await PDFDocument.load(cPdf!)).getPageCount(), 2);
  assertEquals((await PDFDocument.load(sePdf!)).getPageCount(), 2);
});

Deno.test("ATS 1040 Scenario 12 income fixture does not resolve contradictory printed deduction or distribution basis", () => {
  const facts = SCENARIO_1040_12_FACTS;
  assertEquals(Object.keys(scenario104012PartialInput()).sort(), [
    "general",
    "schedule_c",
    "w2",
  ]);
  assertEquals(facts.printedForm1040.line12StandardDeduction, 15_000);
  assertEquals(facts.form7217.printedBasisAllocatedToProperty, 6_000);
  assertEquals(facts.form7217.printedPartIITotalPartnerBasis, 4_000);
  assertEquals(SCENARIO_1040_12_RECONCILIATION.missing.length, 5);
});
