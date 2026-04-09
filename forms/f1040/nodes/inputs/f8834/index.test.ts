import { assertEquals } from "@std/assert";
import { f8834, VehicleType } from "./index.ts";

function compute(input: Parameters<typeof f8834.compute>[1]) {
  return f8834.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("f8834: schema rejects negative cost", () => {
  const result = f8834.inputSchema.safeParse({ f8834s: [{ cost: -100 }] });
  assertEquals(result.success, false);
});

Deno.test("f8834: schema rejects empty array", () => {
  const result = f8834.inputSchema.safeParse({ f8834s: [] });
  assertEquals(result.success, false);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("f8834: zero cost produces no output", () => {
  const result = compute({ f8834s: [{ cost: 0 }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8834: original_use false produces no output", () => {
  const result = compute({ f8834s: [{ cost: 10_000, original_use: false }] });
  assertEquals(result.outputs.length, 0);
});

// ── Two/Three-Wheel Vehicle Credit — 10% rate, $2,500 cap ────────────────────

Deno.test("f8834: two/three-wheel credit = 10% of cost", () => {
  // $10,000 × 10% = $1,000 (below $2,500 cap)
  const result = compute({
    f8834s: [{ cost: 10_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 1_000);
});

Deno.test("f8834: two/three-wheel credit capped at $2,500", () => {
  // $30,000 × 10% = $3,000 → capped at $2,500
  const result = compute({
    f8834s: [{ cost: 30_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 2_500);
});

Deno.test("f8834: two/three-wheel credit at exact cap boundary — $25,000 × 10% = $2,500", () => {
  const result = compute({
    f8834s: [{ cost: 25_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 2_500);
});

// ── Low-Speed Vehicle Credit — 10% rate, $2,500 cap ──────────────────────────

Deno.test("f8834: low-speed credit = 10% of cost", () => {
  // $5,000 × 10% = $500
  const result = compute({
    f8834s: [{ cost: 5_000, vehicle_type: VehicleType.LowSpeed, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 500);
});

Deno.test("f8834: low-speed credit capped at $2,500", () => {
  // $40,000 × 10% = $4,000 → capped at $2,500
  const result = compute({
    f8834s: [{ cost: 40_000, vehicle_type: VehicleType.LowSpeed, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 2_500);
});

// ── Custom Credit Percentage ──────────────────────────────────────────────────

Deno.test("f8834: custom credit_percentage overrides default 10%", () => {
  // $10,000 × 5% = $500
  const result = compute({
    f8834s: [{ cost: 10_000, credit_percentage: 0.05, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 500);
});

Deno.test("f8834: custom credit_percentage still subject to cap", () => {
  // $100,000 × 5% = $5,000 → capped at $2,500
  const result = compute({
    f8834s: [{ cost: 100_000, credit_percentage: 0.05, original_use: true }],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 2_500);
});

// ── Multiple Vehicles Aggregated ──────────────────────────────────────────────

Deno.test("f8834: multiple vehicles — credits aggregated into single schedule3 output", () => {
  // Vehicle 1: $10,000 × 10% = $1,000; Vehicle 2: $5,000 × 10% = $500 → total $1,500
  const result = compute({
    f8834s: [
      { cost: 10_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true },
      { cost: 5_000, vehicle_type: VehicleType.LowSpeed, original_use: true },
    ],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 1_500);
});

Deno.test("f8834: mix of eligible and ineligible vehicles — only eligible credited", () => {
  // Vehicle 1 eligible: $10,000 × 10% = $1,000; Vehicle 2 ineligible (original_use=false)
  const result = compute({
    f8834s: [
      { cost: 10_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true },
      { cost: 10_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: false },
    ],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 1_000);
});

Deno.test("f8834: all ineligible vehicles — no output", () => {
  const result = compute({ f8834s: [{ cost: 5_000, original_use: false }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8834: two vehicles at cap — total capped per vehicle, not combined", () => {
  // Each vehicle: $30,000 × 10% = $3,000 → each capped at $2,500 → total $5,000
  const result = compute({
    f8834s: [
      { cost: 30_000, vehicle_type: VehicleType.TwoThreeWheel, original_use: true },
      { cost: 30_000, vehicle_type: VehicleType.LowSpeed, original_use: true },
    ],
  });
  assertEquals(findSchedule3(result)?.fields.line6z_general_business_credit, 5_000);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("f8834: credit routes to schedule3 line6z_general_business_credit", () => {
  const result = compute({ f8834s: [{ cost: 5_000, original_use: true }] });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit, 500);
});
