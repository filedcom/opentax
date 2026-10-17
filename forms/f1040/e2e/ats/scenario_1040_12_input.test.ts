import { test } from "bun:test";
import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import { appendInput } from "../../../../cli/store/store.ts";
import { createReturnCommand } from "../../../../cli/commands/return.ts";
import {
  exportMefCommand,
  ExportRejectedError,
} from "../../../../cli/commands/export.ts";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../2025/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { w2 as nativeW2 } from "../../2025/mef/forms/income/wages/w2.ts";
import { scheduleC } from "../../2025/mef/forms/income/business/schedule_c.ts";
import { scheduleSE } from "../../2025/mef/forms/taxes/self-employment/schedule_se.ts";
import { scheduleCPdf } from "../../2025/pdf/forms/income/business/schedule_c.ts";
import { scheduleSePdf } from "../../2025/pdf/forms/taxes/self-employment/schedule_se.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import {
  SCENARIO_1040_12_ASSUMPTIONS,
  scenario104012Input,
  scenario104012PartialInput,
  SCENARIO_1040_12_RECONCILIATION,
} from "./scenario_1040_12_input.ts";
import { SCENARIO_1040_12_FACTS } from "./ty2025_cases.ts";

test("ATS 1040 Scenario 12 public wage and business inputs reconcile Schedule C and SE with Form 1040", async () => {
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

test("ATS 1040 Scenario 12 income fixture does not resolve contradictory printed deduction or distribution basis", () => {
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

const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
let schemaAvailable = false;
try {
  schemaAvailable = sys.statSync(schema).isFile;
} catch { /* local IRS schema is gitignored */ }
const amount = (value: unknown) =>
  typeof value === "number" ? value : undefined;

async function exportWithoutForce(inputs: Record<string, unknown>) {
  const baseDir = await sys.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    await appendInput(`${baseDir}/${returnId}`, "start", signed(inputs));
    try {
      return {
        xml: await exportMefCommand({ returnId, baseDir }),
        rejected: [],
      };
    } catch (error) {
      if (!(error instanceof ExportRejectedError)) throw error;
      const rejected = [...new Set(error.entries.map((e) => e.ruleNumber))];
      return {
        xml: await exportMefCommand({ returnId, baseDir, force: true }),
        rejected,
      };
    }
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}

async function xsdErrors(xml: string) {
  const validator = new sys.Command("xmllint", {
    args: ["--noout", "--schema", schema, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validator.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const checked = await validator.output();
  return checked.code === 0 ? "" : new TextDecoder().decode(checked.stderr);
}

test.skipIf(!schemaAvailable)(
  "ATS 1040 Scenario 12 complete return exports without force, validates against the v5.4 XSD and matches the packet",
  async () => {
    const input = scenario104012Input();
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const { xml, rejected } = await exportWithoutForce(input);
    assertEquals(rejected, []);
    assertEquals(await xsdErrors(xml), "");
    assertEquals(
      [...xml.matchAll(/<([A-Za-z0-9]+)\b[^>]*\bdocumentId="/g)].map((m) =>
        m[1]
      ),
      [
        "IRS1040",
        "IRS1040Schedule1",
        "IRS1040Schedule2",
        "IRS1040ScheduleC",
        "IRS1040ScheduleSE",
        "IRS7206",
        "IRS7217",
        "IRS8995",
        "IRSW2",
      ],
    );
    const p = result.pending;
    const printed = SCENARIO_1040_12_FACTS.printedForm1040;
    assertEquals([
      p.f1040.line1a_wages,
      p.f1040.line8_additional_income,
      p.f1040.line9_total_income,
      p.f1040.line10_adjustments,
      p.f1040.line11_agi,
      p.f1040.line23_other_taxes,
      p.f1040.line25a_w2_withheld,
    ], [
      printed.line1aWages,
      printed.line8AdditionalIncome,
      printed.line9TotalIncome,
      printed.line10Adjustments,
      printed.line11AdjustedGrossIncome,
      printed.line23OtherTaxes,
      printed.line25aW2Withholding,
    ]);
    assertEquals(p.f1040.line25d_total_withholding, 14_444);
    assertEquals(p.f1040.line33_total_payments, 14_444);
    assertEquals(p.schedule1.line3_schedule_c, 24_328);
    assertEquals(p.schedule1.line15_se_deduction, 1_719);
    assertEquals(
      p.schedule1.line17_se_health_insurance,
      SCENARIO_1040_12_FACTS.form7206.printedDeduction,
    );
    assertEquals(p.schedule1.line26_total_adjustments, 2_719);
    assertEquals(p.schedule2.line4_se_tax, 3_438);
    assertEquals(
      [p.form7206.line3, p.form7206.line4, p.form7206.line7, p.form7206.line13],
      [1_000, 24_328, 1_719, 22_609],
    );
    for (
      const fragment of [
        "<CashMrktblSecRcvdAmt>4000</CashMrktblSecRcvdAmt>",
        "<RecognizedGainAmt>0</RecognizedGainAmt>",
        "<PrtnrBssPrtshpIntLessCashAmt>6000</PrtnrBssPrtshpIntLessCashAmt>",
        "<TotPrtnrBssAllocDistriPropAmt>6000</TotPrtnrBssAllocDistriPropAmt>",
        "<TotPrtshpBasisPropBfrDistriAmt>32507</TotPrtshpBasisPropBfrDistriAmt>",
        "<SelfEmpldHealthInsDedAmt>1000</SelfEmpldHealthInsDedAmt>",
        "<SelfEmploymentTaxAmt>3438</SelfEmploymentTaxAmt>",
        "<NetProfitOrLossAmt>24328</NetProfitOrLossAmt>",
      ]
    ) assertStringIncludes(xml, fragment);
    const se = scheduleSePdf.projectFields!(p.schedule_se, p);
    const current: Record<string, number | undefined> = {
      "1040 line 12e": amount(p.f1040.line12a_standard_deduction),
      "1040 line 13a": amount(p.f1040.line13_qbi_deduction),
      "1040 line 14": amount(p.f1040.line14_deductions_qbi_total),
      "1040 line 15": amount(p.f1040.line15_taxable_income),
      "1040 line 16": amount(p.f1040.line16_income_tax),
      "1040 line 18": amount(p.f1040.line18_total_tax_before_credits),
      "1040 line 22": amount(p.f1040.line22_tax_after_credits),
      "1040 line 24": amount(p.f1040.line24_total_tax),
      "1040 line 37": amount(p.f1040.line37_amount_owed),
      "Schedule SE line 9": amount(se.line9),
      "Form 7217 Part II (e) total": Number(
        /<TotPrtnrBssPropAftrSect732Amt>(\d+)</.exec(xml)?.[1],
      ),
    };
    for (const conflict of SCENARIO_1040_12_RECONCILIATION.conflicts) {
      assertEquals(current[conflict.line], conflict.current, conflict.line);
      assertNotEquals<number>(conflict.printed, conflict.current);
    }
    assertEquals(printed.line12StandardDeduction, 15_000);
    assertEquals(printed.line37AmountOwed, 7_628);
    assertEquals(
      SCENARIO_1040_12_FACTS.form7217.printedPartIITotalPartnerBasis,
      4_000,
    );
    assertEquals(SCENARIO_1040_12_ASSUMPTIONS.length, 9);
  },
);
