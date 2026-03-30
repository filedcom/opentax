import { assertEquals } from "@std/assert";
import { f8834, VehicleType } from "./index.ts";

function compute(input: Parameters<typeof f8834.compute>[0]) {
  return f8834.compute(input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_cost", () => {
  const result = f8834.inputSchema.safeParse({ f8834s: [{ cost: -100 }] });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_empty_array", () => {
  const result = f8834.inputSchema.safeParse({ f8834s: [] });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_item", () => {
  const result = f8834.inputSchema.safeParse({
    f8834s: [{ cost: 10000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  assertEquals(result.success, true);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("zero_cost_produces_no_output", () => {
  const result = compute({ f8834s: [{ cost: 0 }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("original_use_false_produces_no_output", () => {
  const result = compute({ f8834s: [{ cost: 10000, original_use: false }] });
  assertEquals(result.outputs.length, 0);
});

// ── Two/Three-Wheel Vehicle Credit ───────────────────────────────────────────

Deno.test("two_three_wheel_10pct_rate", () => {
  // $10,000 × 10% = $1,000 (below $2,500 cap)
  const result = compute({
    f8834s: [{ cost: 10000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1000);
});

Deno.test("two_three_wheel_capped_at_2500", () => {
  // $30,000 × 10% = $3,000 → capped at $2,500
  const result = compute({
    f8834s: [{ cost: 30000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

// ── Low-Speed Vehicle Credit ──────────────────────────────────────────────────

Deno.test("low_speed_10pct_rate", () => {
  // $5,000 × 10% = $500
  const result = compute({
    f8834s: [{ cost: 5000, vehicle_type: VehicleType.LowSpeed, original_use: true }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 500);
});

Deno.test("low_speed_capped_at_2500", () => {
  // $40,000 × 10% = $4,000 → capped at $2,500
  const result = compute({
    f8834s: [{ cost: 40000, vehicle_type: VehicleType.LowSpeed, original_use: true }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2500);
});

// ── Multiple Vehicles Aggregated ──────────────────────────────────────────────

Deno.test("multiple_vehicles_credits_aggregated", () => {
  // Vehicle 1: $10,000 × 10% = $1,000; Vehicle 2: $5,000 × 10% = $500 → total $1,500
  const result = compute({
    f8834s: [
      { cost: 10000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true },
      { cost: 5000, vehicle_type: VehicleType.LowSpeed, original_use: true },
    ],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1500);
});

Deno.test("mix_eligible_and_ineligible_vehicles", () => {
  // Vehicle 1 eligible: $10,000 × 10% = $1,000; Vehicle 2 ineligible (original_use=false)
  const result = compute({
    f8834s: [
      { cost: 10000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true },
      { cost: 10000, vehicle_type: VehicleType.TwoThreeWheel, original_use: false },
    ],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 1000);
});

// ── Custom Credit Percentage ──────────────────────────────────────────────────

Deno.test("custom_credit_percentage_overrides_default", () => {
  // $10,000 × 5% = $500
  const result = compute({
    f8834s: [{ cost: 10000, credit_percentage: 0.05, original_use: true }],
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 500);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("routes_to_schedule3", () => {
  const result = compute({ f8834s: [{ cost: 5000, original_use: true }] });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

Deno.test("all_ineligible_produces_no_output", () => {
  const result = compute({ f8834s: [{ cost: 5000, original_use: false }] });
  assertEquals(result.outputs.length, 0);
});
