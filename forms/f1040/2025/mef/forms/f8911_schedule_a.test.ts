import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_13_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form8911ScheduleA } from "./f8911_schedule_a.ts";

const facts = SCENARIO_1040_13_FACTS;
const input = {
  cost: facts.form8911ScheduleA.qualifiedCost,
  business_use_pct: facts.form8911ScheduleA.businessUsePercentage,
  property_description: facts.form8911ScheduleA.propertyDescription,
  property_us_address: facts.taxpayer.address,
  construction_began: facts.form8911ScheduleA.constructionBegan,
  placed_in_service: facts.form8911ScheduleA.placedInService,
  eligible_census_tract: facts.form8911ScheduleA.eligibleCensusTract,
  census_tract_geoid: facts.form8911ScheduleA.censusTractGeoid,
  main_home_property: facts.form8911ScheduleA.mainHomeProperty,
  regular_tax_before_credits: facts.form8911.printedRegularTaxBeforeCredits,
  tentative_minimum_tax: facts.form8911.printedTentativeMinimumTax,
};

Deno.test("Schedule A (Form 8911) emits sourced Scenario 13 property details", () => {
  const xml = form8911ScheduleA.build(input);
  assertStringIncludes(xml, "<FacilityDesc>ELECTRIC CHARGER</FacilityDesc>");
  assertStringIncludes(xml, "<AddressLine1Txt>13 Elm Street</AddressLine1Txt>");
  assertStringIncludes(xml, "<FacilityConstructionStartDt>2025-03-01</FacilityConstructionStartDt>");
  assertStringIncludes(xml, "<FacilityPlacedInServiceDt>2025-03-01</FacilityPlacedInServiceDt>");
  assertStringIncludes(xml, "<CensusTractId2015GEOIDNum>48201100000</CensusTractId2015GEOIDNum>");
  assertStringIncludes(xml, "<AdjustedPersonalUsePartAmt>300</AdjustedPersonalUsePartAmt>");
  assertStringIncludes(xml, "<TotalPersonalUsePartOfCrAmt>300</TotalPersonalUsePartOfCrAmt>");
});

Deno.test("Form 8911 and its Schedule A are separate ordered MeF documents", () => {
  const xml = buildMefXml({ f8911: input }, testFiler());
  assertStringIncludes(xml, 'documentCnt="3"');
  const formIndex = xml.indexOf("<IRS8911 documentId=");
  const scheduleIndex = xml.indexOf("<IRS8911ScheduleA documentId=");
  assertEquals(formIndex >= 0 && formIndex < scheduleIndex, true);
});

Deno.test("Schedule A (Form 8911) omits no-credit input and requires property detail", () => {
  assertEquals(form8911ScheduleA.build({}), "");
  assertEquals(form8911ScheduleA.build({ ...input, regular_tax_before_credits: 0 }), "");
  assertThrows(
    () => form8911ScheduleA.build({ ...input, property_us_address: undefined }),
    Error,
    "structured address",
  );
});
