import { assertEquals, assertAlmostEquals } from "@std/assert";
import { f8874 } from "./index.ts";

function compute(input: Parameters<typeof f8874.compute>[1]) {
  return f8874.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_credit_years_1_to_3", () => {
  const result = f8874.inputSchema.safeParse({ credit_years_1_to_3: -100 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_empty_input", () => {
  const result = f8874.inputSchema.safeParse({});
  assertEquals(result.success, true);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("all_zero_produces_no_output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_investments_zero_carryforward_produces_no_output", () => {
  const result = compute({
    credit_years_1_to_3: 0,
    credit_years_4_to_7: 0,
    prior_year_carryforward: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Direct Credit Amounts (pre-computed) ──────────────────────────────────────

Deno.test("direct_credit_years_1_to_3_only", () => {
  // $50,000 in pre-computed year 1-3 credit
  const result = compute({ credit_years_1_to_3: 50000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

Deno.test("direct_credit_years_4_to_7_only", () => {
  const result = compute({ credit_years_4_to_7: 60000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 60000);
});

Deno.test("direct_credits_both_periods_combined", () => {
  const result = compute({ credit_years_1_to_3: 50000, credit_years_4_to_7: 60000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 110000);
});

// ── Investment Amount → Applied Rate ─────────────────────────────────────────

Deno.test("investment_early_5pct_rate", () => {
  // $1,000,000 × 5% = $50,000
  const result = compute({ investment_amount_early: 1_000_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 50000);
});

Deno.test("investment_later_6pct_rate", () => {
  // $1,000,000 × 6% = $60,000
  const result = compute({ investment_amount_later: 1_000_000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 60000);
});

Deno.test("investment_both_periods_combined", () => {
  // $500k × 5% = $25k; $500k × 6% = $30k → total $55k
  const result = compute({
    investment_amount_early: 500_000,
    investment_amount_later: 500_000,
  });
  const out = findSchedule3(result);
  assertAlmostEquals(out?.fields.line6z_general_business_credit as number, 55000, 0.01);
});

// ── Prior Year Carryforward ───────────────────────────────────────────────────

Deno.test("carryforward_only", () => {
  const result = compute({ prior_year_carryforward: 10000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 10000);
});

Deno.test("carryforward_plus_current_year", () => {
  // $50k current + $10k carryforward = $60k
  const result = compute({ credit_years_1_to_3: 50000, prior_year_carryforward: 10000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 60000);
});

// ── Mixed Inputs ──────────────────────────────────────────────────────────────

Deno.test("all_inputs_combined", () => {
  // direct: $10k + $12k = $22k; computed: $100k×5% + $100k×6% = $5k + $6k = $11k; carryforward $5k → $38k
  const result = compute({
    credit_years_1_to_3: 10000,
    credit_years_4_to_7: 12000,
    investment_amount_early: 100_000,
    investment_amount_later: 100_000,
    prior_year_carryforward: 5000,
  });
  const out = findSchedule3(result);
  assertAlmostEquals(out?.fields.line6z_general_business_credit as number, 38000, 0.01);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("routes_to_schedule3", () => {
  const result = compute({ credit_years_1_to_3: 1000 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
