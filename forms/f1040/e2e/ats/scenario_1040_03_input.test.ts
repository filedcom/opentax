import { assertEquals, assertStringIncludes } from "@std/assert";
import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
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
