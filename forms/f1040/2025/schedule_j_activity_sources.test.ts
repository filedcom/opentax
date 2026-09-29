import { assertEquals, assertThrows } from "@std/assert";
import {
  scheduleJFishingScheduleCSource,
  scheduleJFarmRental4835Source,
} from "./schedule_j_activity_sources.ts";

const fishing = {
  business_reference: "fishing-a",
  line_a_principal_business: "Commercial fishing",
  line_b_business_code: "114110",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 80_000,
  line_22_supplies: 20_000,
};
const fishingEvidence = {
  catch_sales_record_reference: "catch-ledger-2025",
  harvested_fish_entered_commerce_verified: true as const,
  scientific_research_vessel: false as const,
};

Deno.test("Schedule J fishing source recomputes Schedule C activity net", () => {
  assertEquals(scheduleJFishingScheduleCSource(fishing, fishingEvidence), {
    form: "schedule_c",
    activity_reference: "fishing-a",
    at_risk_net: 60_000,
  });
});

Deno.test("Schedule J does not classify non-fishing Schedule C by free text", () => {
  assertThrows(() => scheduleJFishingScheduleCSource({
    ...fishing,
    line_b_business_code: "114210",
  }, fishingEvidence), Error, "business code 114110");
});

Deno.test("Schedule J fishing source includes a sourced Schedule C loss", () => {
  assertEquals(scheduleJFishingScheduleCSource({
    ...fishing,
    line_1_gross_receipts: 5_000,
  }, fishingEvidence).at_risk_net, -15_000);
});

Deno.test("Schedule J fishing source requires catch commerce records", () => {
  assertThrows(() => scheduleJFishingScheduleCSource(fishing, {
    ...fishingEvidence,
    catch_sales_record_reference: "",
  }));
});

const farmRental = {
  activity_id: "rental-a",
  activity_name: "Sharecrop farm rental",
  livestock_crop_income: 48_000,
  expense_feed: 8_000,
};
const farmRentalEvidence = {
  written_lease_reference: "share-lease-2025",
  production_share_rent_verified: true as const,
  agreement_predates_tenant_activity_verified: true as const,
};

Deno.test("Schedule J Form 4835 source recomputes farm rental net", () => {
  assertEquals(scheduleJFarmRental4835Source(farmRental, farmRentalEvidence), {
    form: "form_4835",
    activity_reference: "rental-a",
    at_risk_net: 40_000,
  });
});

Deno.test("Schedule J Form 4835 source stops at passive-loss allocation", () => {
  assertThrows(() => scheduleJFarmRental4835Source({
    ...farmRental,
    livestock_crop_income: 2_000,
    some_investment_not_at_risk: false,
  }, farmRentalEvidence), Error, "current loss needs Form 8582 allocation");
  assertThrows(() => scheduleJFarmRental4835Source({
    ...farmRental,
    prior_unallowed_passive_operating: 1_000,
  }, farmRentalEvidence), Error, "prior passive loss needs Form 8582 allocation");
});

Deno.test("Schedule J Form 4835 source requires a qualifying production-share lease", () => {
  assertThrows(() => scheduleJFarmRental4835Source(farmRental, {
    ...farmRentalEvidence,
    written_lease_reference: "",
  }));
});
