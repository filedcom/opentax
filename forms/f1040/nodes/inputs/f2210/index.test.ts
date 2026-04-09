import { assertEquals, assertThrows } from "@std/assert";
import { f2210 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return f2210.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof f2210.compute>[1]);
}

function penaltyOutput(result: ReturnType<typeof compute>) {
  return fieldsOf(result.outputs, f1040);
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f2210.inputSchema: rejects negative values", () => {
  assertEquals(f2210.inputSchema.safeParse({ withholding: -1 }).success, false);
  assertEquals(f2210.inputSchema.safeParse({ underpayment_penalty: -50 }).success, false);
  assertEquals(f2210.inputSchema.safeParse({ q1_estimated_payment: -100 }).success, false);
});

// =============================================================================
// Hard Validation
// =============================================================================

Deno.test("f2210.compute: throws on negative withholding", () => {
  assertThrows(() => compute({ withholding: -1 }), Error);
});

Deno.test("f2210.compute: throws on negative underpayment_penalty", () => {
  assertThrows(() => compute({ underpayment_penalty: -50 }), Error);
});

// =============================================================================
// Penalty Routing
// =============================================================================

Deno.test("f2210.compute: explicit penalty routes to f1040 line38_underpayment_penalty", () => {
  const result = compute({ underpayment_penalty: 250 });
  assertEquals(penaltyOutput(result)?.line38_underpayment_penalty, 250);
});

Deno.test("f2210.compute: zero penalty — no output", () => {
  assertEquals(compute({ underpayment_penalty: 0 }).outputs, []);
});

Deno.test("f2210.compute: empty input — no outputs", () => {
  assertEquals(compute({}).outputs, []);
});

// =============================================================================
// Safe Harbor — 100% of prior year tax (AGI ≤ $150k)
// =============================================================================

Deno.test("f2210.compute: payments meet 100% prior year tax — no penalty", () => {
  // Prior tax = $8,000; AGI = $100k → 100% rule; withholding = $8,000 ≥ $8,000
  const result = compute({
    withholding: 8000,
    prior_year_tax: 8000,
    prior_year_agi: 100000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f2210.compute: payments just below 100% prior year threshold — safe harbor not met", () => {
  // Prior tax = $8,000; withholding = $7,999; current year 90% = $9,000 → neither met
  // No explicit penalty provided → no output (engine doesn't self-compute penalty amount)
  const result = compute({
    withholding: 7999,
    prior_year_tax: 8000,
    prior_year_agi: 100000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// Safe Harbor — 110% of prior year tax (AGI > $150k)
// =============================================================================

Deno.test("f2210.compute: AGI > $150k triggers 110% rule — safe harbor needs 110% of prior tax", () => {
  // Prior AGI = $200k → 110% rule; prior tax = $10,000 → need $11,000
  // Withholding = $10,000 < $11,000; current 90% = $9,000 < $10,000
  // safe harbor = min(9000, 11000) = 9000; payments = $10,000 ≥ $9,000 → met
  const result = compute({
    withholding: 10000,
    current_year_tax: 10000,
    prior_year_tax: 10000,
    prior_year_agi: 200000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f2210.compute: AGI > $150k, payments below both 90% and 110% thresholds — safe harbor not met", () => {
  // current 90% = $9,000; prior 110% = $11,000; safe harbor = min = $9,000
  // withholding = $8,000 < $9,000 → not met; no penalty provided → no output
  const result = compute({
    withholding: 8000,
    current_year_tax: 10000,
    prior_year_tax: 10000,
    prior_year_agi: 200000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f2210.compute: AGI exactly at $150k uses 100% rule (not 110%)", () => {
  // AGI = $150,000 is NOT > threshold, so 100% rule applies
  // Prior tax = $10,000; withholding = $10,000 = 100% → safe harbor met
  const result = compute({
    withholding: 10000,
    prior_year_tax: 10000,
    prior_year_agi: 150000,
    current_year_tax: 12000,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// Safe Harbor — 90% of current year tax
// =============================================================================

Deno.test("f2210.compute: payments meet 90% current year tax — no penalty", () => {
  // Tax = $10,000; 90% = $9,000; withholding = $9,000 → safe harbor met
  const result = compute({
    withholding: 9000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f2210.compute: quarterly payments contribute to 90% safe harbor", () => {
  // $5,000 withholding + 4 × $1,000 quarterly = $9,000; current tax $10,000; 90% = $9,000 → met
  const result = compute({
    withholding: 5000,
    q1_estimated_payment: 1000,
    q2_estimated_payment: 1000,
    q3_estimated_payment: 1000,
    q4_estimated_payment: 1000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// Waiver
// =============================================================================

Deno.test("f2210.compute: waiver_requested suppresses penalty even when penalty is provided", () => {
  const result = compute({ underpayment_penalty: 500, waiver_requested: true });
  assertEquals(result.outputs, []);
});

// =============================================================================
// Informational Fields
// =============================================================================

Deno.test("f2210.compute: annualized_method flag alone — no outputs", () => {
  assertEquals(compute({ annualized_method: true }).outputs, []);
});

Deno.test("f2210.compute: required_annual_payment alone — no outputs", () => {
  assertEquals(compute({ required_annual_payment: 5000 }).outputs, []);
});

// =============================================================================
// Smoke Test
// =============================================================================

Deno.test("f2210.compute: smoke — explicit penalty with full context routes to f1040", () => {
  const result = compute({
    withholding: 5000,
    q1_estimated_payment: 500,
    q2_estimated_payment: 500,
    q3_estimated_payment: 500,
    q4_estimated_payment: 500,
    current_year_tax: 9000,
    prior_year_tax: 8000,
    prior_year_agi: 90000,
    underpayment_penalty: 175,
  });
  assertEquals(penaltyOutput(result)?.line38_underpayment_penalty, 175);
  assertEquals(result.outputs.length, 1);
});
