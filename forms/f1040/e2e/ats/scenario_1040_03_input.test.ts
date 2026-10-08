import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
import { schedule_f } from "../../nodes/intermediate/forms/schedule_f/index.ts";
import { schedule_se } from "../../nodes/intermediate/forms/schedule_se/index.ts";
import { scheduleF } from "../../2025/mef/forms/business/schedule_f.ts";
import { scheduleSE as scheduleSeMef } from "../../2025/mef/forms/taxes/schedule_se.ts";
import { scheduleFPdf } from "../../2025/pdf/forms/business/schedule_f.ts";
import { scheduleSePdf } from "../../2025/pdf/forms/taxes/schedule_se.ts";
import { testFiler } from "../../2025/mef/execution/test-filer.ts";
import { SCENARIO_1040_03_FACTS } from "./ty2025_cases.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import { PDFDocument } from "pdf-lib";
import {
  scenario104003Input,
  SCENARIO_1040_03_RECONCILIATION,
  SCENARIO_1040_03_SOURCE,
} from "./scenario_1040_03_input.ts";

Deno.test("ATS 1040 Scenario 3 maps only printed 1099-R and Schedule F source facts", () => {
  const input = scenario104003Input();
  const general = input.general as Record<string, unknown>;
  const form1099R = (input.f1099r as Record<string, unknown>[])[0];
  const scheduleF = input.schedule_f as {
    farm_optional_method_elected: boolean;
    schedule_fs: Record<string, unknown>[];
  };
  const farm = scheduleF.schedule_fs[0];

  assertEquals(general.taxpayer_ssn, "400001035");
  assertEquals(general.filing_status, undefined);
  assertEquals(general.digital_assets, undefined);
  assertEquals(form1099R.box1_gross_distribution, 53_778);
  assertEquals(form1099R.box2a_taxable_amount, 43_100);
  assertEquals(form1099R.box4_federal_withheld, 3_405);
  assertEquals(form1099R.box7_distribution_code, DistributionCode.Code7);
  assertEquals(scheduleF.farm_optional_method_elected, true);
  assertEquals(farm.line1_sales_livestock_resale, 8_111);
  assertEquals(farm.line1b_cost_livestock_resale, 0);
  assertEquals(farm.line11_chemicals, 750);
  assertEquals(farm.line16_feed, 890);
  assertEquals(farm.line17_fertilizers, 250);
  assertEquals(farm.line26_seeds, 2_970);

  // Printed aggregate amounts are not fabricated into transaction records.
  assertEquals(Object.keys(input).sort(), ["f1099r", "general", "schedule_f"]);
});

Deno.test("ATS 1040 Scenario 3 reconciles filled source lines, not blank printed totals", () => {
  const source = SCENARIO_1040_03_SOURCE;
  const recon = SCENARIO_1040_03_RECONCILIATION;
  const shortGain = source.scheduleD.shortTermLine1aProceeds -
    source.scheduleD.shortTermLine1aBasis;
  const longGain = source.scheduleD.longTermLine8aProceeds -
    source.scheduleD.longTermLine8aBasis;
  const farmExpenses = source.scheduleF.line11Chemicals +
    source.scheduleF.line16Feed + source.scheduleF.line17Fertilizer +
    source.scheduleF.line26Seeds;
  const rentalExpenses = source.form4835.line9Chemicals +
    source.form4835.line14Feed + source.form4835.line17Gasoline +
    source.form4835.line23Repairs + source.form4835.line26Supplies;
  const farmNet = source.scheduleF.line1aPurchasedLivestockAndResaleSales -
    source.scheduleF.line1bResaleBasis - farmExpenses;
  const rentalNet = source.form4835.line1ProductionIncome - rentalExpenses;

  assertEquals(shortGain, recon.sourceDerived.scheduleDShortGain);
  assertEquals(longGain, recon.sourceDerived.scheduleDLongGain);
  assertEquals(shortGain + longGain, recon.sourceDerived.scheduleDCombinedGain);
  assertEquals(farmExpenses, recon.sourceDerived.scheduleFExpenses);
  assertEquals(farmNet, recon.sourceDerived.scheduleFNetProfit);
  assertEquals(rentalExpenses, recon.sourceDerived.form4835Expenses);
  assertEquals(rentalNet, recon.sourceDerived.form4835NetIncome);
  assertEquals(
    recon.printedSource.taxableStateRefund + farmNet + rentalNet,
    recon.sourceDerived.schedule1AdditionalIncomeBeforeOtherItems,
  );
  assertEquals(
    recon.printedSource.pensionTaxable + shortGain + longGain +
      recon.sourceDerived.schedule1AdditionalIncomeBeforeOtherItems,
    recon.sourceDerived.grossIncomeBeforeOtherItems,
  );
});

Deno.test("ATS 1040 Scenario 3 retains issued Form 4835 entries without filling blank totals", () => {
  const rental = SCENARIO_1040_03_SOURCE.form4835;
  assertEquals(rental, {
    activelyParticipated: null,
    line1ProductionIncome: 17_035,
    line2aCooperativeDistributionsGross: 0,
    line3aAgriculturalProgramPaymentsGross: 0,
    line4aCccLoansElection: 0,
    line4bCccLoansForfeitedGross: 0,
    line5aCropInsuranceReceived: 0,
    line6OtherIncome: 0,
    line9Chemicals: 879,
    line14Feed: 350,
    line17Gasoline: 690,
    line23Repairs: 1_355,
    line26Supplies: 2_700,
  });
  assertEquals(Object.hasOwn(rental, "line7GrossFarmRentalIncome"), false);
  assertEquals(Object.hasOwn(rental, "line31TotalExpenses"), false);
  assertEquals(Object.hasOwn(rental, "line32NetFarmRentalIncome"), false);
  assertEquals(
    Object.hasOwn(SCENARIO_1040_03_SOURCE.scheduleE, "line40"),
    false,
  );
  assertEquals(
    Object.hasOwn(SCENARIO_1040_03_SOURCE.scheduleE, "line41"),
    false,
  );
  assertEquals(
    Object.hasOwn(SCENARIO_1040_03_SOURCE.scheduleE, "line42"),
    false,
  );
});

Deno.test("ATS 1040 Scenario 3 printed farm entries route to Schedule 1 and the farm optional method", () => {
  const input = scenario104003Input();
  const farmInput = input.schedule_f as {
    farm_optional_method_elected: boolean;
    schedule_fs: Record<string, unknown>[];
  };
  const result = schedule_f.compute(
    { taxYear: 2025, formType: "f1040" },
    schedule_f.inputSchema.parse(farmInput),
  );
  const fields = (nodeType: string) =>
    result.outputs.find((item) => item.nodeType === nodeType)?.fields;

  assertEquals(
    fields("schedule1")?.line6_schedule_f,
    SCENARIO_1040_03_RECONCILIATION.sourceDerived.scheduleFNetProfit,
  );
  assertEquals(
    fields("schedule_se")?.net_profit_schedule_f,
    SCENARIO_1040_03_RECONCILIATION.sourceDerived.scheduleFNetProfit,
  );
  assertEquals(
    fields("schedule_se")?.gross_farm_income,
    SCENARIO_1040_03_RECONCILIATION.printedSource.scheduleFGrossSales,
  );
  assertEquals(fields("schedule_se")?.farm_optional_method_elected, true);

  // The packet elects Part II but leaves Schedule SE's calculated lines blank.
  // Its Schedule F source therefore supplies a computed, not printed, target:
  // line 15/4b/6 derives from 2/3 × 8,111, filed as 5,407;
  // whole-dollar tax = 670 + 157 = 827.
  const seInput = schedule_se.inputSchema.parse(fields("schedule_se"));
  const seResult = schedule_se.compute(
    { taxYear: 2025, formType: "f1040" },
    seInput,
  );
  const seFields = (nodeType: string) =>
    seResult.outputs.find((item) => item.nodeType === nodeType)?.fields;
  assertEquals(seFields("schedule2")?.line4_se_tax, 827);
  assertEquals(seFields("schedule1")?.line15_se_deduction, 414);
  assertEquals(seFields("form8959")?.se_income, 8_111 * 2 / 3);
});

Deno.test("ATS 1040 Scenario 3 farm source matches native and printable Schedule F and SE", async () => {
  const input = scenario104003Input();
  const farmInput = schedule_f.inputSchema.parse(input.schedule_f);
  const farmResult = schedule_f.compute(
    { taxYear: 2025, formType: "f1040" },
    farmInput,
  );
  const seFields = farmResult.outputs.find((item) =>
    item.nodeType === "schedule_se"
  )?.fields;
  const parsedSe = schedule_se.inputSchema.parse(seFields);
  const filer = {
    ...testFiler(),
    primarySSN: SCENARIO_1040_03_FACTS.taxpayer.ssn,
    fullName:
      `${SCENARIO_1040_03_FACTS.taxpayer.firstName} ${SCENARIO_1040_03_FACTS.taxpayer.lastName}`,
  };

  const [farmXml] = scheduleF.build(farmInput, { filer });
  assertStringIncludes(
    farmXml,
    "<SalesOfLvstckBghtForResaleAmt>8111</SalesOfLvstckBghtForResaleAmt>",
  );
  assertStringIncludes(farmXml, "<TotalExpensesAmt>4860</TotalExpensesAmt>");
  assertStringIncludes(
    farmXml,
    "<NetFarmProfitLossAmt>3251</NetFarmProfitLossAmt>",
  );
  const [farmPdf] = scheduleFPdf.instances!(farmInput, filer);
  assertEquals(farmPdf.line9_gross_income, 8_111);
  assertEquals(farmPdf.line33_total_expenses, 4_860);
  assertEquals(farmPdf.line34_net_profit, 3_251);
  assertEquals(farmPdf.line_f_made_1099_payments, false);
  const farmPdfBytes = await fillFormPdf(
    scheduleFPdf,
    farmPdf,
    filer,
    ".pdf-cache",
  );
  const filledFarm = await PDFDocument.load(farmPdfBytes!);
  assertEquals(filledFarm.getPageCount(), 2);

  const seXml = scheduleSeMef.build(parsedSe, { filer });
  assert(
    typeof seXml === "string",
    "ATS Scenario3 must emit one Schedule SE document",
  );
  assertStringIncludes(seXml, "<OptionalMethodAmt>5407</OptionalMethodAmt>");
  assertStringIncludes(
    seXml,
    "<SelfEmploymentTaxAmt>827</SelfEmploymentTaxAmt>",
  );
  assertStringIncludes(
    seXml,
    "<DeductibleSelfEmploymentTaxAmt>414</DeductibleSelfEmploymentTaxAmt>",
  );
  const identity = input.general as Record<string, unknown>;
  const sePdf = scheduleSePdf.projectFields!(parsedSe, {
    general: identity,
    f1040: identity,
    schedule_f: farmInput,
  });
  assertEquals(sePdf.owner_ssn, SCENARIO_1040_03_FACTS.taxpayer.ssn);
  // The shared projector retains precision; both output builders file dollars.
  assertEquals(Math.round(sePdf.line15 as number), 5_407);
  assertEquals(sePdf.line12, 827);
  const sePdfBytes = await fillFormPdf(
    scheduleSePdf,
    sePdf,
    filer,
    ".pdf-cache",
    { schedule2: { line4_se_tax: 827 } },
  );
  const filledSe = await PDFDocument.load(sePdfBytes!);
  assertEquals(filledSe.getPageCount(), 2);
});

Deno.test("ATS 1040 Scenario 3 preserves optional-method eligibility and missing targets", () => {
  const recon = SCENARIO_1040_03_RECONCILIATION;
  assertEquals(
    recon.printedSource.scheduleFGrossSales <=
      recon.sourceDerived.farmOptionalMethodGrossIncomeLimit,
    true,
  );
  assertEquals(
    recon.sourceDerived.scheduleFNetProfit <
      recon.sourceDerived.farmOptionalMethodNetProfitLimit,
    true,
  );
  assertEquals(
    recon.sourceDerived.farmOptionalMethodTwoThirdsGrossNumerator /
      recon.sourceDerived.farmOptionalMethodTwoThirdsGrossDenominator,
    8_111 * 2 / 3,
  );
  assertEquals(SCENARIO_1040_03_SOURCE.form4835.activelyParticipated, null);
  assertStringIncludes(
    recon.notAtsReadyBecause.join(" "),
    "No completed 1040 tax",
  );
});
