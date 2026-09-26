import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form4684 } from "./f4684.ts";

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

Deno.test("Form 4684: empty input emits no document", () => {
  assertEquals(form4684.build({}), "");
});

Deno.test("Form 4684: long-term business property reconciles Section B", () => {
  const xml = form4684.build(casualty);
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

Deno.test("Form 4684: filing needs property and casualty identity", () => {
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

Deno.test("Form 4684: holding period is checked from actual dates", () => {
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

Deno.test("Form 4684: personal and short-term cases stay explicit", () => {
  assertThrows(
    () =>
      form4684.build({
        personal_fmv_before: 20_000,
        personal_fmv_after: 10_000,
        personal_basis: 20_000,
        is_federal_disaster: true,
      }),
    Error,
    "personal casualty MeF",
  );
  assertThrows(
    () => form4684.build({ ...casualty, business_is_section_1231: false }),
    Error,
    "documented long-term business property",
  );
});

Deno.test("Form 4684: linked Form 4797 must report the same loss", () => {
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
