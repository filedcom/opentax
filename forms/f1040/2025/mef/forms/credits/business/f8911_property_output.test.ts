import { buildForm8911CreditXml, form8911 } from "./f8911.ts";
import { projectForm8911CreditAmounts } from "../../../../pdf/forms/credits/business/f8911.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  type F8911Property,
  FuelType,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import {
  buildForm8911PropertyXml,
  form8911ScheduleA,
} from "./f8911_schedule_a.ts";
import { projectForm8911PropertyAmounts } from "../../../../pdf/forms/credits/business/f8911_schedule_a.ts";

export const mixedBusinessProperty: F8911Property = {
  cost: 4000,
  business_use_pct: 0.375,
  fuel_type: FuelType.ElectricCharging,
  property_description: "Mixed-use EV charger",
  property_us_address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  construction_began: "2025-05-01",
  placed_in_service: "2025-06-01",
  eligible_census_tract: true,
  census_tract_geoid: "10003000100",
  main_home_property: true,
  business_source: {
    proprietor_ssn: "123456789",
    schedule_c_business_reference: "equipment-services",
    source_document_reference: "charger-invoice-1",
    section179_deduction: 500,
    rate_basis: "base",
    subject_to_passive_activity_limit: false,
  },
};

Deno.test("Form 8911 property output retains mixed-use percentages and section 179 only in business cost", () => {
  const before = JSON.stringify(mixedBusinessProperty);
  const xml = buildForm8911PropertyXml(mixedBusinessProperty);
  for (
    const [tag, value] of [
      ["BusinessInvestmentUsePct", "0.375"],
      ["BusinessInvestmentUseAmt", "1500"],
      ["Section179ExpenseDeductionAmt", "500"],
      ["NetBusinessUsePartAmt", "1000"],
      ["PWARequirementMetInd", "false"],
      ["TotBusinessUsePartAmt", "60"],
      ["SmallerTotOrMaxBusUsePartAmt", "60"],
      ["TotQlfyPropLessBusInvstUseAmt", "2500"],
      ["TotalPersonalUsePartOfCrAmt", "750"],
    ]
  ) assertStringIncludes(xml, `<${tag}>${value}</${tag}>`);
  assertEquals(projectForm8911PropertyAmounts(mixedBusinessProperty), {
    line8: 4000,
    line9: "37.5",
    line10: 1500,
    line11: 500,
    line12: 1000,
    increased_rate: false,
    line14: 60,
    line16: 60,
    main_home_property: true,
    line18: 2500,
    line19: 750,
    line21: 750,
  });
  assertEquals(JSON.stringify(mixedBusinessProperty), before);
});

Deno.test("Form 8911 property output caps business credit and obeys the full-business stop instruction", () => {
  const property = {
    ...mixedBusinessProperty,
    cost: 4_000_000,
    business_use_pct: 1,
  };
  const xml = buildForm8911PropertyXml(property);
  const pdf = projectForm8911PropertyAmounts(property);
  assertEquals(pdf.line14, 239970);
  assertEquals(pdf.line16, 100000);
  assertEquals(pdf.main_home_property, undefined);
  assertEquals(pdf.line18, undefined);
  assertEquals(xml.includes("PropertyUsedMainHomeInd"), false);
  assertEquals(xml.includes("TotalPersonalUsePartOfCrAmt"), false);
  assertStringIncludes(
    xml,
    "<SmallerTotOrMaxBusUsePartAmt>100000</SmallerTotOrMaxBusUsePartAmt>",
  );
});

Deno.test("Form 8911 property output distinguishes increased rates, personal-only skips and non-home stops", () => {
  for (const rate_basis of ["pwa", "construction_before_2023_01_29"] as const) {
    const property = {
      ...mixedBusinessProperty,
      construction_began: rate_basis === "pwa" ? "2025-05-01" : "2023-01-28",
      business_source: {
        ...mixedBusinessProperty.business_source!,
        rate_basis,
      },
    };
    assertStringIncludes(
      buildForm8911PropertyXml(property),
      `<PWARequirementMetInd>${rate_basis === "pwa"}</PWARequirementMetInd>`,
    );
    assertEquals(
      projectForm8911PropertyAmounts(property).increased_rate,
      rate_basis === "pwa",
    );
    assertEquals(projectForm8911PropertyAmounts(property).line16, 300);
  }
  const personal = {
    ...mixedBusinessProperty,
    business_use_pct: 0,
    business_source: undefined,
  };
  assertEquals(
    projectForm8911PropertyAmounts(personal).increased_rate,
    undefined,
  );
  assertEquals(
    buildForm8911PropertyXml(personal).includes("PWARequirementMetInd"),
    false,
  );
  const notHome = { ...mixedBusinessProperty, main_home_property: false };
  assertEquals(projectForm8911PropertyAmounts(notHome).line18, undefined);
  assertStringIncludes(
    buildForm8911PropertyXml(notHome),
    "<PropertyUsedMainHomeInd>false</PropertyUsedMainHomeInd>",
  );
});

Deno.test("Form 8911 property rendering rejects unsupported ratio precision without opening business filing", () => {
  const property = { ...mixedBusinessProperty, business_use_pct: 0.333333 };
  assertThrows(() => buildForm8911PropertyXml(property), Error, "five-decimal");
  assertThrows(
    () => projectForm8911PropertyAmounts(property),
    Error,
    "five-decimal",
  );
  assertEquals(
    projectForm8911PropertyAmounts({
      ...mixedBusinessProperty,
      business_use_pct: 0.33333,
    }).line9,
    "33.333",
  );
  assertThrows(
    () => form8911ScheduleA.build({ ...mixedBusinessProperty }),
    Error,
    "Form 3800 path",
  );
});

Deno.test("Form 8911 parent keeps business credit separate from the personal tax limit", () => {
  const input = {
    ...mixedBusinessProperty,
    regular_tax_before_credits: 100,
    tentative_minimum_tax: 0,
  };
  const xml = buildForm8911CreditXml(input);
  assertStringIncludes(
    xml,
    "<BusInvstUseRefuelingPropCrAmt>60</BusInvstUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<BusinessInvstUsePartOfCrAmt>60</BusinessInvstUsePartOfCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<PrsnlUseRefuelingPropCrAmt>750</PrsnlUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPersonalUsePartOfCrAmt>100</TotalPersonalUsePartOfCrAmt>",
  );
  const pdf = projectForm8911CreditAmounts(input);
  assertEquals(pdf.line1, 60);
  assertEquals(pdf.line3, 60);
  assertEquals(pdf.line4, 750);
  assertEquals(pdf.line10, 100);
  assertThrows(() => form8911.build(input), Error, "Form 3800 path");
});

Deno.test("Form 8911 parent sums unrounded business property credits and omits personal-only tax operands", () => {
  const property = {
    ...mixedBusinessProperty,
    cost: 1006.25,
    business_use_pct: 1,
    business_source: {
      ...mixedBusinessProperty.business_source!,
      section179_deduction: 0,
    },
  };
  const input = {
    properties: [
      { ...property, property_reference: "unit-1" },
      { ...property, property_reference: "unit-2" },
    ],
  };
  const xml = buildForm8911CreditXml(input);
  assertStringIncludes(
    xml,
    "<TotQlfyAltFuelVehRefuelPropCnt>2</TotQlfyAltFuelVehRefuelPropCnt>",
  );
  assertStringIncludes(
    xml,
    "<BusinessInvstUsePartOfCrAmt>121</BusinessInvstUsePartOfCrAmt>",
  );
  assertEquals(xml.includes("RegularTaxBeforeCreditsAmt"), false);
  assertEquals(projectForm8911CreditAmounts(input), {
    property_count: 2,
    line1: 121,
    line3: 121,
  });
  assertThrows(
    () =>
      projectForm8911CreditAmounts({
        properties: [input.properties[0], input.properties[0]],
      }),
    Error,
    "unique",
  );
});

Deno.test("Form 8911 parent retains business credit but stops the personal worksheet at either zero limit", () => {
  for (const tentative_minimum_tax of [0, 100]) {
    const input = {
      ...mixedBusinessProperty,
      regular_tax_before_credits: tentative_minimum_tax,
      tentative_minimum_tax,
    };
    const pdf = projectForm8911CreditAmounts(input);
    const xml = buildForm8911CreditXml(input);
    assertEquals(pdf.line3, 60);
    assertEquals(pdf.line10, undefined);
    assertEquals(xml.includes("TotalPersonalUsePartOfCrAmt"), false);
    if (tentative_minimum_tax === 0) {
      assertEquals(pdf.line7, 0);
      assertEquals(pdf.line8, undefined);
      assertEquals(xml.includes("TentativeMinimumTaxAmt"), false);
    } else {
      assertEquals(pdf.line9, 0);
      assertStringIncludes(
        xml,
        "<AdjustedRegularTaxAmt>0</AdjustedRegularTaxAmt>",
      );
    }
  }
});
