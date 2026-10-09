import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../2025/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { form8911Pdf } from "../../2025/pdf/forms/credits/business/f8911.ts";
import { form8911ScheduleAPdf } from "../../2025/pdf/forms/credits/business/f8911_schedule_a.ts";
import { STANDARD_DEDUCTION_BASE_2025 } from "../../nodes/config/2025.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_13_FACTS } from "./ty2025_cases.ts";
import {
  scenario104013Input,
  SCENARIO_1040_13_RECONCILIATION,
} from "./scenario_1040_13_input.ts";

Deno.test("ATS 1040 Scenario 13 maps every printed source form into one input", () => {
  const input = scenario104013Input();
  const facts = SCENARIO_1040_13_FACTS;
  const general = input.general as Record<string, unknown>;
  const [w2] = input.w2 as Record<string, unknown>[];
  const refueling = input.f8911 as Record<string, unknown>;
  assertEquals(general.taxpayer_ssn, facts.taxpayer.ssn);
  assertEquals(general.spouse_ssn, facts.spouse.ssn);
  assertEquals(
    facts.form1040.mainHomeInUsOverHalfYearCheckboxChecked,
    false,
  );
  assertEquals(general.main_home_in_us_over_half_year, false);
  assertEquals(w2.employer_ein, facts.w2.employerEin);
  assertEquals(w2.employee_ssn, facts.taxpayer.ssn);
  assertEquals(w2.box1_wages, facts.w2.box1Wages);
  assertEquals(w2.box2_fed_withheld, facts.w2.box2FederalWithholding);
  assertEquals(refueling.cost, facts.form8911ScheduleA.qualifiedCost);
  assertEquals(
    refueling.census_tract_geoid,
    facts.form8911ScheduleA.censusTractGeoid,
  );
  assertEquals(refueling.regular_tax_before_credits, undefined);
  assertEquals(refueling.tentative_minimum_tax, undefined);
  assertEquals(facts.form8911.printedRegularTaxBeforeCredits, 162);
  assertEquals(facts.form8911.printedTentativeMinimumTax, 0);
});

Deno.test("ATS 1040 Scenario 13 preserves the printed return and identifies its $1,500 deduction conflict", () => {
  const { printed, current2025 } = SCENARIO_1040_13_RECONCILIATION;
  assertEquals(printed.form1040Pages, [2, 3]);
  assertEquals(printed.form8911Page, 7);
  assertEquals(printed.wages, 31_620);
  assertEquals(printed.adjustedGrossIncome, 31_620);
  assertEquals(printed.standardDeduction, 30_000);
  assertEquals(
    current2025.standardDeduction,
    STANDARD_DEDUCTION_BASE_2025[FilingStatus.MFJ],
  );
  assertEquals(
    current2025.standardDeduction - printed.standardDeduction,
    1_500,
  );
  assertEquals(printed.taxableIncome, 1_620);
  assertEquals(current2025.taxableIncomeBeforeAnyOtherAdjustments, 120);
  assertEquals(
    printed.taxableIncome - current2025.taxableIncomeBeforeAnyOtherAdjustments,
    1_500,
  );
  assertEquals(printed.regularTax, 162);
  assertEquals(printed.allowedRefuelingCredit, 162);
  assertEquals(printed.schedule3Credit, 162);
  assertEquals(printed.alternativeMinimumTax, 0);
  assertEquals(printed.totalTax, 0);
  assertEquals(printed.withholding, 609);
  assertEquals(printed.refund, 609);
  assertEquals(
    printed.wages - printed.standardDeduction,
    printed.taxableIncome,
  );
  assertEquals(printed.regularTax - printed.schedule3Credit, printed.totalTax);
  assertEquals(printed.withholding - printed.totalTax, printed.refund);
  // The PDF's Form 8911 tax limit is tied to its printed 1040 line 16.
  // It is not a verified limit for the return using the current deduction.
  assertEquals(printed.allowedRefuelingCredit === printed.regularTax, true);
});

Deno.test("ATS 1040 Scenario 13 routes W-2 facts but stops before a current-law Form 8911 credit", () => {
  const result = f1040_2025.executeReturn(scenario104013Input());
  const form = result.pending.f1040;
  assertEquals(form?.line1a_wages, 31_620);
  assertEquals(form?.line25a_w2_withheld, 609);
  assertEquals(form?.line12a_standard_deduction, 31_500);
  assertEquals(form?.line15_taxable_income, 120);
  assertEquals(
    result.pending.schedule3?.line6j_alt_fuel_vehicle_refueling,
    undefined,
  );
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes(
        "Form 8911 needs regular tax and tentative minimum tax",
      )
    ),
    true,
  );
  assertEquals(
    form?.line15_taxable_income ===
      SCENARIO_1040_13_RECONCILIATION.printed.taxableIncome,
    false,
  );
});

Deno.test("ATS 1040 Scenario 13 PDF parent and property reject the printed tax limit on the public current-year return", () => {
  const input = scenario104013Input();
  const result = f1040_2025.executeReturn(input);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const printed = SCENARIO_1040_13_RECONCILIATION.printed;
  assertEquals(typeof result.pending.f1040.line16_income_tax, "number");
  assertNotEquals(result.pending.f1040.line16_income_tax, printed.regularTax);
  const staleSource = {
    ...(input.f8911 as Record<string, unknown>),
    regular_tax_before_credits: printed.regularTax,
    tentative_minimum_tax:
      SCENARIO_1040_13_FACTS.form8911.printedTentativeMinimumTax,
  };
  const stalePending = { ...result.pending, f8911: staleSource };
  for (const descriptor of [form8911Pdf, form8911ScheduleAPdf]) {
    assertThrows(
      () => descriptor.instances!({}, filer, stalePending),
      Error,
      "source tax limit or credit disagrees with finalized Form 1040",
    );
  }
});
