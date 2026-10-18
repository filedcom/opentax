import { test } from "bun:test";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../../../builder.ts";
import { testFiler } from "../../../execution/test-filer.ts";
import { form4684 } from "./f4684.ts";
import { PersonalCasualtyKind } from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";

const casualty = {
  business_fmv_before: 80_000,
  business_fmv_after: 50_000,
  business_basis: 50_000,
  business_insurance: 0,
  business_is_section_1231: true,
  business_property_description: "Workshop equipment",
  business_property_location: "Austin, TX",
  business_acquired_date: "2020-04-01",
  business_casualty_date: "2025-06-15",
  business_casualty_description: "Storm damaged workshop equipment",
};

const monsoon = {
  description: "Monsoon",
  casualty_date: "2025-02-01",
  kind: PersonalCasualtyKind.QualifiedDisaster,
  fema_declaration_number: "EM-2345",
  qualified_disaster_confirmed: true as const,
  properties: [{
    property_type: "Shed",
    address_line1: "2 Main St",
    city: "Juneau",
    state: "AK",
    zip: "99801",
    acquired_date: "2000-01-01",
    basis: 12_000,
    insurance: 2_000,
    fmv_before: 11_000,
    fmv_after: 6_000,
  }],
};
const fire = {
  ...monsoon,
  description: "Fire",
  kind: PersonalCasualtyKind.FederallyDeclaredDisaster,
  fema_declaration_number: "DR-1234",
  qualified_disaster_confirmed: undefined,
  properties: [{
    ...monsoon.properties[0],
    property_type: "House",
    basis: 15_000,
    fmv_before: 14_000,
    fmv_after: 2_000,
  }],
};

// One Form 4684 per casualty through line 12; only one carries lines 13
// through 18 (Form 4684, Section A; business rule F4684-003-02).
test("Form 4684: Section A files one form per casualty and totals on the first", () => {
  const xml = form4684.build(
    { personal_casualties: [fire, monsoon] },
    {
      pending: {
        f1040: { line11_agi: 33_650, line12e_itemized_deductions: 30_000 },
        schedule_a: {
          line_15_casualty_theft_loss: 6_535,
          net_qualified_disaster_loss: 2_500,
        },
        standard_deduction: { net_qualified_disaster_loss: 2_500 },
      },
    },
  );
  if (typeof xml === "string") throw new Error("expected two forms");
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<FEMADisasterDeclarationNum>DR-1234</FEMADisasterDeclarationNum>");
  assertStringIncludes(xml[0], "<PropertyMinusInsuranceValueAmt>10000</PropertyMinusInsuranceValueAmt>");
  assertStringIncludes(xml[0], "<NetCasualtyOrTheftLossAmt>9900</NetCasualtyOrTheftLossAmt>");
  assertStringIncludes(xml[0], "<TotalNetCasualtyOrTheftLossAmt>12400</TotalNetCasualtyOrTheftLossAmt>");
  assertStringIncludes(xml[0], "<TotalTheftGainLessTotalLossAmt>2500</TotalTheftGainLessTotalLossAmt>");
  assertStringIncludes(xml[0], "<TotalLossLessTotalTheftGainAmt>9900</TotalLossLessTotalTheftGainAmt>");
  assertStringIncludes(xml[0], "<TenPercentOfAGIAmt>3365</TenPercentOfAGIAmt>");
  assertStringIncludes(xml[0], "<CalcAdjGroIncmMnsTotNetLossAmt>6535</CalcAdjGroIncmMnsTotNetLossAmt>");
  assertStringIncludes(xml[1], "<CasualtyOrTheftLossLimitAmt>500</CasualtyOrTheftLossLimitAmt>");
  assertEquals(xml[1].includes("TotalNetCasualtyOrTheftLossAmt"), false);
  assertThrows(
    () =>
      form4684.build({ personal_casualties: [fire, monsoon] }, {
        pending: {
          f1040: { line11_agi: 33_650, line12e_itemized_deductions: 30_000 },
          schedule_a: { line_15_casualty_theft_loss: 6_000 },
        },
      }),
    Error,
    "must match Schedule A",
  );
});

test("Form 4684: empty input emits no document", () => {
  assertEquals(form4684.build({}), "");
});

function single(xml: string | readonly string[]): string {
  if (typeof xml !== "string") throw new Error("expected one Form 4684");
  return xml;
}

test("Form 4684: long-term business property reconciles Section B", () => {
  const xml = single(form4684.build(casualty));
  assertStringIncludes(
    xml,
    "<CostOrAdjustedBasisAmt>50000</CostOrAdjustedBasisAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFairMarketValueAmt>30000</NetFairMarketValueAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetBusinessPropertyLossAmt>30000</NetBusinessPropertyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<LongTermTradeOrBusinessTotAmt>30000</LongTermTradeOrBusinessTotAmt>",
  );
  assertStringIncludes(
    xml,
    "<LongTermPropNetGainOrLossAmt>-30000</LongTermPropNetGainOrLossAmt>",
  );
});

test("Form 4684: filing needs property and casualty identity", () => {
  assertThrows(
    () =>
      form4684.build({ ...casualty, business_property_description: undefined }),
    Error,
    "documented long-term business property",
  );
  assertThrows(
    () =>
      form4684.build({ ...casualty, business_casualty_description: undefined }),
    Error,
    "documented long-term business property",
  );
});

test("Form 4684: holding period is checked from actual dates", () => {
  assertThrows(
    () => form4684.build({ ...casualty, business_acquired_date: "2024-07-01" }),
    Error,
    "held more than one year",
  );
  assertThrows(
    () => form4684.build({ ...casualty, business_casualty_date: "2024-06-15" }),
    Error,
    "tax year 2025",
  );
  assertThrows(
    () => form4684.build({ ...casualty, business_acquired_date: "2020-02-30" }),
    Error,
    "valid date",
  );
});

test("Form 4684: personal with business and short-term cases stay explicit", () => {
  assertThrows(
    () => form4684.build({ ...casualty, personal_casualties: [monsoon] }),
    Error,
    "Section A and B on separate forms",
  );
  assertThrows(
    () => form4684.build({ ...casualty, business_is_section_1231: false }),
    Error,
    "documented long-term business property",
  );
});

test("Form 4684: linked Form 4797 must report the same loss", () => {
  assertThrows(
    () => buildMefXml({ form4684: casualty }, testFiler()),
    Error,
    "must match Form 4797 line 14",
  );
  assertThrows(
    () =>
      buildMefXml({
        form4684: casualty,
        form4797: { ordinary_gain_form4684: -29_000 },
      }, testFiler()),
    Error,
    "must match Form 4797 line 14",
  );
  assertThrows(
    () =>
      buildMefXml({
        form4797: { ordinary_gain_form4684: -30_000 },
      }, testFiler()),
    Error,
    "needs its Form 4684 source",
  );
});
