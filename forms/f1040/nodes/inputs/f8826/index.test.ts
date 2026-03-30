import { assertEquals } from "@std/assert";
import { f8826 } from "./index.ts";

function compute(input: Parameters<typeof f8826.compute>[0]) {
  return f8826.compute({ taxYear: 2025 }, input);
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "schedule3");
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_expenditures", () => {
  const result = f8826.inputSchema.safeParse({ eligible_expenditures: -100 });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_input", () => {
  const result = f8826.inputSchema.safeParse({
    eligible_expenditures: 5000,
    gross_receipts: 500000,
    fte_count: 20,
  });
  assertEquals(result.success, true);
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("zero_expenditures_produces_no_output", () => {
  const result = compute({ eligible_expenditures: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("expenditures_at_250_floor_produces_no_output", () => {
  // $250 − $250 = $0 creditable → no output
  const result = compute({ eligible_expenditures: 250 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("expenditures_below_250_produces_no_output", () => {
  const result = compute({ eligible_expenditures: 100 });
  assertEquals(result.outputs.length, 0);
});

// ── Eligibility Gates ─────────────────────────────────────────────────────────

Deno.test("over_1M_receipts_AND_over_30_fte_produces_no_output", () => {
  // Both conditions fail → not eligible
  const result = compute({
    eligible_expenditures: 5000,
    gross_receipts: 1_500_000,
    fte_count: 35,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("over_1M_receipts_but_under_30_fte_is_eligible", () => {
  // fte ≤30 qualifies even if receipts > $1M
  const result = compute({
    eligible_expenditures: 5000,
    gross_receipts: 1_500_000,
    fte_count: 25,
  });
  const out = findSchedule3(result);
  assertEquals(out !== undefined, true);
});

Deno.test("under_1M_receipts_but_over_30_fte_is_eligible", () => {
  // receipts ≤$1M qualifies even if fte > 30
  const result = compute({
    eligible_expenditures: 5000,
    gross_receipts: 800_000,
    fte_count: 35,
  });
  const out = findSchedule3(result);
  assertEquals(out !== undefined, true);
});

Deno.test("exactly_1M_receipts_is_eligible", () => {
  const result = compute({ eligible_expenditures: 5000, gross_receipts: 1_000_000 });
  const out = findSchedule3(result);
  assertEquals(out !== undefined, true);
});

Deno.test("exactly_30_fte_is_eligible", () => {
  const result = compute({ eligible_expenditures: 5000, fte_count: 30 });
  const out = findSchedule3(result);
  assertEquals(out !== undefined, true);
});

// ── Credit Calculation ────────────────────────────────────────────────────────

Deno.test("basic_credit_50pct_of_expenditures_minus_250", () => {
  // ($5,000 − $250) × 50% = $2,375
  const result = compute({ eligible_expenditures: 5000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2375);
});

Deno.test("expenditures_just_above_250_floor", () => {
  // ($251 − $250) × 50% = $0.50
  const result = compute({ eligible_expenditures: 251 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 0.5);
});

Deno.test("max_credit_at_10250_expenditures", () => {
  // ($10,250 − $250) × 50% = $5,000
  const result = compute({ eligible_expenditures: 10250 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

Deno.test("expenditures_above_10250_still_capped_at_5000", () => {
  // $20,000 expenditures → cap at $10,250 → ($10,250 − $250) × 50% = $5,000
  const result = compute({ eligible_expenditures: 20000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 5000);
});

Deno.test("no_eligibility_fields_assumes_eligible", () => {
  // No gross_receipts or fte_count provided → both checks pass (undefined) → eligible
  const result = compute({ eligible_expenditures: 5000 });
  const out = findSchedule3(result);
  assertEquals(out?.fields.line6z_general_business_credit, 2375);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("routes_to_schedule3", () => {
  const result = compute({ eligible_expenditures: 5000 });
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

Deno.test("credit_uses_line6z_field", () => {
  const result = compute({ eligible_expenditures: 5000 });
  assertEquals(result.outputs[0]?.fields.line6z_general_business_credit !== undefined, true);
});
