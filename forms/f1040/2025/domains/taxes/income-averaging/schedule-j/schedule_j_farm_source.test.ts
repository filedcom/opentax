import { assertEquals, assertThrows } from "@std/assert";
import { reconcileScheduleJFarmOnlyElection } from "./schedule_j_farm_source.ts";

const source = {
  schedule_f: {
    schedule_fs: [{
      farm_id: "farm-a",
      line_a_principal_crop_activity: "grain",
      line_b_agricultural_activity_code: "111100" as const,
      line_e_material_participation: true,
      accounting_method: "cash" as const,
      line1_sales_livestock_resale: 0,
      line2_sales_products_raised: 80_000,
      line16_feed: 20_000,
    }],
  },
  schedule1: {
    line6_schedule_f: 60_000,
    line15_se_deduction: 4_000,
  },
  form1040: {
    line8_additional_income: 60_000,
    line9_total_income: 60_000,
    line10_adjustments: 4_000,
    line11_agi: 56_000,
    line15_taxable_income: 40_000,
  },
  elected_farm_income: 30_000,
};

Deno.test("Schedule J farm-only election reconciles Schedule F and attributable SE deduction", () => {
  assertEquals(reconcileScheduleJFarmOnlyElection(source), {
    elected_farm_income: 30_000,
    taxable_farm_income: 56_000,
  });
});

Deno.test("Schedule J farm-only election refuses more than taxable income", () => {
  assertThrows(() => reconcileScheduleJFarmOnlyElection({
    ...source,
    elected_farm_income: 40_001,
  }), Error, "exceeds sourced farming or taxable income");
});

Deno.test("Schedule J farm-only election refuses unlinked other taxable income", () => {
  assertThrows(() => reconcileScheduleJFarmOnlyElection({
    ...source,
    form1040: {
      ...source.form1040,
      line1z_total_wages: 10_000,
      line9_total_income: 70_000,
      line11_agi: 66_000,
    },
  }), Error, "does not reconcile");
});

Deno.test("Schedule J farm-only election refuses a net profit inconsistent with Schedule F", () => {
  assertThrows(() => reconcileScheduleJFarmOnlyElection({
    ...source,
    schedule1: {
      ...source.schedule1,
      line6_schedule_f: 61_000,
    },
  }), Error, "does not reconcile");
});
