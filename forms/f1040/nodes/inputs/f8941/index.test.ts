import { assertEquals } from "@std/assert";
import { f8941 } from "./index.ts";

function compute(input: Parameters<typeof f8941.compute>[1]) {
  return f8941.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_premiums", () => {
  const result = f8941.inputSchema.safeParse({
    fte_count: 10,
    average_annual_wages: 30000,
    premiums_paid: -500,
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_input", () => {
  const result = f8941.inputSchema.safeParse({
    fte_count: 10,
    average_annual_wages: 30000,
    premiums_paid: 50000,
    shop_enrollment: true,
  });
  assertEquals(result.success, true);
});

// ── Eligibility Gates ─────────────────────────────────────────────────────────

Deno.test("exactly_25_fte_produces_no_output", () => {
  // ≥25 FTEs → no credit
  const result = compute({
    fte_count: 25,
    average_annual_wages: 30000,
    premiums_paid: 50000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("over_25_fte_produces_no_output", () => {
  const result = compute({
    fte_count: 30,
    average_annual_wages: 30000,
    premiums_paid: 50000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("avg_wages_at_56000_produces_no_output", () => {
  // avg wages ≥ $56k → no credit
  const result = compute({
    fte_count: 5,
    average_annual_wages: 56000,
    premiums_paid: 50000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("shop_enrollment_false_produces_no_output", () => {
  const result = compute({
    fte_count: 5,
    average_annual_wages: 30000,
    premiums_paid: 50000,
    shop_enrollment: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_premiums_produces_no_output", () => {
  const result = compute({
    fte_count: 5,
    average_annual_wages: 30000,
    premiums_paid: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Full Credit (≤10 FTEs, avg wages ≤$28k) ──────────────────────────────────

Deno.test("full_50pct_credit_small_employer_low_wages", () => {
  // 5 FTEs, $20k avg wages → no phase-out → $100k × 50% = $50k
  const result = compute({
    fte_count: 5,
    average_annual_wages: 20000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

Deno.test("tax_exempt_35pct_rate", () => {
  // 5 FTEs, $20k avg → $100k × 35% = $35k
  const result = compute({
    fte_count: 5,
    average_annual_wages: 20000,
    premiums_paid: 100000,
    is_tax_exempt: true,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 35000);
});

// ── FTE Phase-Out ─────────────────────────────────────────────────────────────

Deno.test("fte_phase_out_halfway_at_17_5_fte", () => {
  // 17.5 FTEs → 50% FTE reduction; avg wages ≤$28k → no wage reduction
  // Multiplier = (1 - 0.5) × 1.0 = 0.5
  // $100k × 50% × 0.5 = $25k
  const result = compute({
    fte_count: 17.5,
    average_annual_wages: 20000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 25000);
});

Deno.test("fte_10_is_phase_out_start_no_reduction", () => {
  // Exactly 10 FTEs → 0% FTE reduction
  const result = compute({
    fte_count: 10,
    average_annual_wages: 20000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

// ── Wage Phase-Out ────────────────────────────────────────────────────────────

Deno.test("wage_phase_out_halfway_at_42000_avg", () => {
  // avg $42k → halfway through $28k–$56k range → 50% wage reduction
  // FTEs ≤10 → no FTE reduction
  // Multiplier = 1.0 × 0.5 = 0.5
  // $100k × 50% × 0.5 = $25k
  const result = compute({
    fte_count: 5,
    average_annual_wages: 42000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 25000);
});

Deno.test("wage_28000_is_phase_out_start_no_reduction", () => {
  // avg wages exactly $28k → 0% wage reduction
  const result = compute({
    fte_count: 5,
    average_annual_wages: 28000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

// ── Combined Phase-Out ────────────────────────────────────────────────────────

Deno.test("combined_phase_out_both_50pct", () => {
  // 17.5 FTEs (50% FTE reduction) + $42k avg wages (50% wage reduction)
  // Multiplier = (1 - 0.5) × (1 - 0.5) = 0.25
  // $100k × 50% × 0.25 = $12,500
  const result = compute({
    fte_count: 17.5,
    average_annual_wages: 42000,
    premiums_paid: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 12500);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({
    fte_count: 5,
    average_annual_wages: 20000,
    premiums_paid: 50000,
  });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
