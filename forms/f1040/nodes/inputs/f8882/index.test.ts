import { assertEquals } from "@std/assert";
import { f8882 } from "./index.ts";

function compute(input: Parameters<typeof f8882.compute>[1]) {
  return f8882.compute({ taxYear: 2025 }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_childcare_expenses", () => {
  const result = f8882.inputSchema.safeParse({ qualified_childcare_expenses: -1 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_empty_input", () => {
  const result = f8882.inputSchema.safeParse({});
  assertEquals(result.success, true);
});

// ── Zero Cases ────────────────────────────────────────────────────────────────

Deno.test("no_expenses_produces_no_output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero_expenses_produces_no_output", () => {
  const result = compute({
    qualified_childcare_expenses: 0,
    resource_referral_expenses: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Credit Calculation ────────────────────────────────────────────────────────

Deno.test("childcare_expenses_at_25pct", () => {
  // $400,000 × 25% = $100,000
  const result = compute({ qualified_childcare_expenses: 400000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 100000);
});

Deno.test("resource_referral_at_10pct", () => {
  // $200,000 × 10% = $20,000
  const result = compute({ resource_referral_expenses: 200000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 20000);
});

Deno.test("combined_childcare_and_referral", () => {
  // $200,000 × 25% = $50,000 + $100,000 × 10% = $10,000 → $60,000
  const result = compute({
    qualified_childcare_expenses: 200000,
    resource_referral_expenses: 100000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 60000);
});

// ── Annual Cap $150,000 ────────────────────────────────────────────────────────

Deno.test("credit_capped_at_150000", () => {
  // $600,000 × 25% = $150,000 → exactly at cap
  const result = compute({ qualified_childcare_expenses: 600000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 150000);
});

Deno.test("credit_above_cap_clamped_to_150000", () => {
  // $800,000 × 25% = $200,000 → capped at $150,000
  const result = compute({ qualified_childcare_expenses: 800000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 150000);
});

Deno.test("combined_above_cap_clamped_to_150000", () => {
  // $500k × 25% + $200k × 10% = $125k + $20k = $145k → under cap
  const result = compute({
    qualified_childcare_expenses: 500000,
    resource_referral_expenses: 200000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 145000);
});

Deno.test("combined_over_cap_clamped", () => {
  // $500k × 25% + $400k × 10% = $125k + $40k = $165k → capped at $150k
  const result = compute({
    qualified_childcare_expenses: 500000,
    resource_referral_expenses: 400000,
  });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 150000);
});

Deno.test("routes_to_schedule3", () => {
  const result = compute({ qualified_childcare_expenses: 100000 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});
