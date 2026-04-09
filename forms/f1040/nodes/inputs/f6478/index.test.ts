import { assertEquals } from "@std/assert";
import { f6478, BiofuelType } from "./index.ts";

function compute(input: Parameters<typeof f6478.compute>[1]) {
  return f6478.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_accepts_empty_fuel_entries", () => {
  const result = f6478.inputSchema.safeParse({ fuel_entries: [] });
  assertEquals(result.success, true);
});

Deno.test("schema_rejects_negative_gallons", () => {
  const result = f6478.inputSchema.safeParse({
    fuel_entries: [{ fuel_type: BiofuelType.BiodieselMixture, gallons: -1 }],
  });
  assertEquals(result.success, false);
});

// ── Zero Cases ────────────────────────────────────────────────────────────────

Deno.test("no_entries_produces_no_output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_gallons_produces_no_output", () => {
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.BiodieselMixture, gallons: 0 }] });
  assertEquals(result.outputs.length, 0);
});

// ── Credit Rates ─────────────────────────────────────────────────────────────

Deno.test("biodiesel_mixture_rate_1_per_gal", () => {
  // 1000 gal × $1.00 = $1,000
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.BiodieselMixture, gallons: 1000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1000);
});

Deno.test("alcohol_mixture_rate_045_per_gal", () => {
  // 1000 gal × $0.45 = $450
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.AlcoholMixture, gallons: 1000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 450);
});

Deno.test("cellulosic_biofuel_rate_101_per_gal", () => {
  // 1000 gal × $1.01 = $1,010
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.CellulosicBiofuel, gallons: 1000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1010);
});

Deno.test("second_generation_biofuel_rate_101_per_gal", () => {
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.SecondGenerationBiofuel, gallons: 500 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 505);
});

Deno.test("small_agri_producer_rate_010_per_gal", () => {
  // 1000 gal × $0.10 = $100
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.SmallAgriProducer, gallons: 1000 }] });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 100);
});

// ── Override Rate ─────────────────────────────────────────────────────────────

Deno.test("credit_rate_override_used_when_provided", () => {
  // 1000 gal × $0.50 override = $500
  const result = compute({
    fuel_entries: [{ fuel_type: BiofuelType.BiodieselMixture, gallons: 1000, credit_rate_override: 0.50 }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 500);
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_fuel_types_aggregate", () => {
  // 1000 biodiesel ($1,000) + 1000 alcohol ($450) = $1,450
  const result = compute({
    fuel_entries: [
      { fuel_type: BiofuelType.BiodieselMixture, gallons: 1000 },
      { fuel_type: BiofuelType.AlcoholMixture, gallons: 1000 },
    ],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1450);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({ fuel_entries: [{ fuel_type: BiofuelType.BiodieselMixture, gallons: 100 }] });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
