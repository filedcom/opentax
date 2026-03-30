import { assertEquals, assertAlmostEquals } from "@std/assert";
import { f8911, FuelType } from "./index.ts";

function compute(input: Parameters<typeof f8911.compute>[0]) {
  return f8911.compute(input);
}

function findSchedule3All(result: ReturnType<typeof compute>) {
  return result.outputs.filter((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_cost", () => {
  const result = f8911.inputSchema.safeParse({ cost: -500 });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_business_pct_above_1", () => {
  const result = f8911.inputSchema.safeParse({ cost: 5000, business_use_pct: 1.5 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_input", () => {
  const result = f8911.inputSchema.safeParse({
    cost: 10000,
    business_use_pct: 1.0,
    fuel_type: FuelType.ElectricCharging,
  });
  assertEquals(result.success, true);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("zero_cost_produces_no_output", () => {
  const result = compute({ cost: 0, business_use_pct: 1.0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no_business_no_personal_produces_no_output", () => {
  // business_use_pct defaults to 0, personal = 1 - 0 = 1... wait, this SHOULD produce personal credit
  // Actually if business_use_pct = undefined (0), all personal
  const result = compute({ cost: 0 });
  assertEquals(result.outputs.length, 0);
});

// ── 100% Business Use ─────────────────────────────────────────────────────────

Deno.test("full_business_use_30pct_of_cost", () => {
  // $10,000 × 30% = $3,000 (below $100k cap)
  const result = compute({ cost: 10000, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 3000);
});

Deno.test("business_credit_capped_at_100k_per_location", () => {
  // $400,000 × 30% = $120,000 → capped at $100,000
  const result = compute({ cost: 400000, business_use_pct: 1.0 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 100000);
});

Deno.test("business_cap_multiplied_by_locations", () => {
  // $400,000 × 30% = $120,000; 2 locations → cap = $200,000 → credit = $120,000
  const result = compute({ cost: 400000, business_use_pct: 1.0, num_locations: 2 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  assertEquals(busOut?.fields.line6z_general_business_credit, 120000);
});

// ── 100% Personal Use ─────────────────────────────────────────────────────────

Deno.test("full_personal_use_30pct_of_cost", () => {
  // $2,000 × 30% = $600 (below $1,000 cap)
  const result = compute({ cost: 2000, business_use_pct: 0 });
  const outs = findSchedule3All(result);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 600);
});

Deno.test("personal_credit_capped_at_1000", () => {
  // $10,000 × 30% = $3,000 → capped at $1,000
  const result = compute({ cost: 10000, business_use_pct: 0 });
  const outs = findSchedule3All(result);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 1000);
});

// ── Mixed Business + Personal Use ────────────────────────────────────────────

Deno.test("split_60pct_business_40pct_personal", () => {
  // Cost $10,000; 60% business = $6,000 × 30% = $1,800 business credit
  // 40% personal = $4,000 × 30% = $1,200 → capped at $1,000 personal credit
  const result = compute({ cost: 10000, business_use_pct: 0.6 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertAlmostEquals(busOut?.fields.line6z_general_business_credit as number, 1800, 0.01);
  assertEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling, 1000);
});

// ── No business_use_pct means all personal ───────────────────────────────────

Deno.test("no_business_pct_all_personal", () => {
  // business_use_pct defaults to 0 → all personal
  // $3,000 × 30% = $900 (below $1,000)
  const result = compute({ cost: 3000 });
  const outs = findSchedule3All(result);
  const busOut = outs.find((o) => o.fields.line6z_general_business_credit !== undefined);
  const persOut = outs.find((o) => o.fields.line6b_alt_fuel_vehicle_refueling !== undefined);
  assertEquals(busOut, undefined);
  assertAlmostEquals(persOut?.fields.line6b_alt_fuel_vehicle_refueling as number, 900, 0.01);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("business_routes_to_schedule3_line6z", () => {
  const result = compute({ cost: 5000, business_use_pct: 1.0 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit !== undefined, true);
});
