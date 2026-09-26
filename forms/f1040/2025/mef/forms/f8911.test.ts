import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_13_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { FuelType } from "../../../nodes/inputs/f8911/index.ts";
import { form8911 } from "./f8911.ts";

const source = SCENARIO_1040_13_FACTS;
const input = {
  cost: source.form8911ScheduleA.qualifiedCost,
  business_use_pct: source.form8911ScheduleA.businessUsePercentage,
  fuel_type: FuelType.ElectricCharging,
  property_description: source.form8911ScheduleA.propertyDescription,
  property_us_address: source.taxpayer.address,
  construction_began: source.form8911ScheduleA.constructionBegan,
  placed_in_service: source.form8911ScheduleA.placedInService,
  eligible_census_tract: source.form8911ScheduleA.eligibleCensusTract,
  census_tract_geoid: source.form8911ScheduleA.censusTractGeoid,
  main_home_property: source.form8911ScheduleA.mainHomeProperty,
  regular_tax_before_credits: source.form8911.printedRegularTaxBeforeCredits,
  tentative_minimum_tax: source.form8911.printedTentativeMinimumTax,
};

Deno.test("Form 8911 serializes the sourced tentative and allowed Scenario 13 credit", () => {
  const xml = form8911.build(input);
  assertStringIncludes(
    xml,
    "<PrsnlUseRefuelingPropCrAmt>300</PrsnlUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<RegularTaxBeforeCreditsAmt>162</RegularTaxBeforeCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TentativeMinimumTaxAmt>0</TentativeMinimumTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedRegularTaxAmt>162</AdjustedRegularTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPersonalUsePartOfCrAmt>162</TotalPersonalUsePartOfCrAmt>",
  );
});

Deno.test("Form 8911 omits a no-credit document and rejects business use", () => {
  assertEquals(form8911.build({}), "");
  assertEquals(form8911.build({ ...input, cost: 0 }), "");
  assertEquals(form8911.build({ ...input, regular_tax_before_credits: 0 }), "");
  assertThrows(
    () => form8911.build({ ...input, business_use_pct: 0.5 }),
    Error,
    "Form 3800 path",
  );
});
