import { assert, assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "./registry.ts";

Deno.test("active-rental PAL stages remain acyclic and finalize after Form 8582", () => {
  const plan = buildExecutionPlan(registry);
  const position = (name: string) =>
    plan.findIndex((step) => step.nodeType === name);
  for (
    const name of [
      "form4797",
      "schedule_d",
      "agi_aggregator",
      "form8582",
      "schedule_d_final",
      "agi_final",
    ]
  ) assert(position(name) >= 0);
  assert(position("form4797") < position("schedule_d"));
  assert(position("schedule_d") < position("agi_aggregator"));
  assert(position("agi_aggregator") < position("form8582"));
  assert(position("form8582") < position("schedule_d_final"));
  assert(position("schedule_d_final") < position("agi_final"));
});

Deno.test("public Schedule E sale reaches Form 4797 and final Form 1040 once", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
    },
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 0,
      form_1099_payments_made: false,
      disposed_of: true,
      passive_property_sales: [{
        activity_id: "rental-house",
        activity_name: "Rental house",
        part: "I",
        property_description: "Retained rental parcel",
        acquired_on: "2023-04-01",
        sold_on: "2025-05-01",
        gross_sales_price: 12_000,
        cost_or_other_basis: 10_000,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
      }, {
        activity_id: "rental-house",
        activity_name: "Rental house",
        part: "II",
        property_description: "Short-held rental parcel",
        acquired_on: "2025-01-01",
        sold_on: "2025-06-01",
        gross_sales_price: 5_000,
        cost_or_other_basis: 4_500,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
      }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.form4797.passive_property_sales as unknown[]).length,
    2,
  );
  assertEquals(result.pending.schedule_d.line_11_form2439, 2_000);
  assertEquals(result.pending.f1040.line11_agi, 2_500);
});
