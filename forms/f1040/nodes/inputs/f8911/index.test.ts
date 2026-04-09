import { assertEquals, assertAlmostEquals } from "@std/assert";
import { f8911, FuelType } from "./index.ts";

function compute(input: Parameters<typeof f8911.compute>[1]) {
  return f8911.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findSchedule3All(result: ReturnType<typeof compute>) {
  return result.outputs.filter((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("f8911: schema rejects negative cost", () => {
  const result = f8911.inputSchema.safeParse({ cost: -500 });
  assertEquals(result.success, false);
});

Deno.test("f8911: schema rejects business_use_pct above 1", () => {
  const result = f8911.inputSchema.safeParse({ cost: 5000, business_use_pct: 1.5 });
  assertEquals(result.success, false);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("f8911: zero cost produces no output", () => {
  const result = compute({ cost: 0, business_use_pct: 1.0 });
  assertEquals(result.outputs.length, 0);
});

// ── 100% Business Use — 30% rate, $100k cap ──────────────────────────────────

Deno.test("f8911: business credit = 30% of cost", () => {
  // $10,000 × 30% = $3,000 (below $100k cap)
  const result = compute({ cost: 10_000, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 3_000);
});

Deno.test("f8911: business credit capped at $100,000 per location", () => {
  // $400,000 × 30% = $120,000 → capped at $100,000
  const result = compute({ cost: 400_000, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 100_000);
});

Deno.test("f8911: business cap multiplied by num_locations", () => {
  // $400,000 × 30% = $120,000; 2 locations → cap = $200,000 → credit = $120,000
  const result = compute({ cost: 400_000, business_use_pct: 1.0, num_locations: 2 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 120_000);
});

Deno.test("f8911: business credit at exactly cap boundary — $333,333 × 30% = $99,999.90", () => {
  // Just below $100k cap → no capping
  const result = compute({ cost: 333_333, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertAlmostEquals(busOut?.fields.line6z_general_business_credit as number, 99_999.9, 0.01);
});

// ── 100% Personal Use — 30% rate, $1,000 cap ─────────────────────────────────

Deno.test("f8911: personal credit = 30% of cost", () => {
  // $2,000 × 30% = $600 (below $1,000 cap)
  const result = compute({ cost: 2_000, business_use_pct: 0 });
  const outs = findSchedule3All(result);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 600);
});

Deno.test("f8911: personal credit capped at $1,000", () => {
  // $10,000 × 30% = $3,000 → capped at $1,000
  const result = compute({ cost: 10_000, business_use_pct: 0 });
  const outs = findSchedule3All(result);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 1_000);
});

Deno.test("f8911: no business_use_pct defaults to all-personal", () => {
  // business_use_pct defaults to 0 → all personal
  // $3,000 × 30% = $900 (below $1,000)
  const result = compute({ cost: 3_000 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(busOut, undefined);
  assertAlmostEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling as number, 900, 0.01);
});

// ── Mixed Business + Personal Use ────────────────────────────────────────────

Deno.test("f8911: 60% business / 40% personal — both credits computed correctly", () => {
  // Cost $10,000
  // Business: $10,000 × 60% × 30% = $1,800
  // Personal: $10,000 × 40% × 30% = $1,200 → capped at $1,000
  const result = compute({ cost: 10_000, business_use_pct: 0.6 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertAlmostEquals(busOut?.fields.line6z_general_business_credit as number, 1_800, 0.01);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 1_000);
});

Deno.test("f8911: 100% business — no personal credit output", () => {
  const result = compute({ cost: 5_000, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  assertEquals(outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined), undefined);
});

Deno.test("f8911: 100% personal — no business credit output", () => {
  const result = compute({ cost: 5_000, business_use_pct: 0 });
  const outs = findSchedule3All(result);
  assertEquals(outs.find((o) => o.fields.line6z_general_business_credit !== undefined), undefined);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("f8911: business credit routes to schedule3 line6z_general_business_credit", () => {
  const result = compute({ cost: 5_000, business_use_pct: 1.0 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit, 1_500);
});

Deno.test("f8911: personal credit routes to schedule3 line6b_alt_fuel_vehicle_refueling", () => {
  const result = compute({ cost: 2_000, business_use_pct: 0 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6b_alt_fuel_vehicle_refueling, 600);
});

// ── Fuel Type Enum Accepted ───────────────────────────────────────────────────

Deno.test("f8911: all FuelType enum values accepted by schema", () => {
  for (const fuelType of Object.values(FuelType)) {
    const result = f8911.inputSchema.safeParse({ cost: 1_000, fuel_type: fuelType });
    assertEquals(result.success, true);
  }
});
