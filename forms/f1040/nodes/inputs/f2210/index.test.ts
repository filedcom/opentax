import { assertEquals, assertThrows } from "@std/assert";
import { f2210 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function compute(input: Record<string, unknown>) {
  return f2210.compute(input as Parameters<typeof f2210.compute>[0]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f2210.inputSchema: empty input passes", () => {
  const parsed = f2210.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f2210.inputSchema: negative withholding fails", () => {
  const parsed = f2210.inputSchema.safeParse({ withholding: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f2210.inputSchema: negative q1_estimated_payment fails", () => {
  const parsed = f2210.inputSchema.safeParse({ q1_estimated_payment: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f2210.inputSchema: negative current_year_tax fails", () => {
  const parsed = f2210.inputSchema.safeParse({ current_year_tax: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f2210.inputSchema: negative underpayment_penalty fails", () => {
  const parsed = f2210.inputSchema.safeParse({ underpayment_penalty: -50 });
  assertEquals(parsed.success, false);
});

Deno.test("f2210.inputSchema: valid full input passes", () => {
  const parsed = f2210.inputSchema.safeParse({
    withholding: 8000,
    q1_estimated_payment: 1000,
    q2_estimated_payment: 1000,
    q3_estimated_payment: 1000,
    q4_estimated_payment: 1000,
    current_year_tax: 12000,
    prior_year_tax: 10000,
    prior_year_agi: 80000,
    underpayment_penalty: 0,
    waiver_requested: false,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. No Penalty — No Output
// =============================================================================

Deno.test("f2210.compute: empty input — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2210.compute: no penalty provided and safe harbor met — no output", () => {
  // Withholding = $9000, current year tax = $10000; 90% = $9000 → safe harbor met exactly
  const result = compute({
    withholding: 9000,
    current_year_tax: 10000,
    prior_year_tax: 9500,
    prior_year_agi: 100000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2210.compute: waiver_requested=true — no penalty output", () => {
  const result = compute({
    underpayment_penalty: 500,
    waiver_requested: true,
  });
  // Waiver means safe harbor met → no output even with penalty provided
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Penalty Routing
// =============================================================================

Deno.test("f2210.compute: underpayment_penalty provided — routes to f1040 line38_underpayment_penalty", () => {
  const result = compute({ underpayment_penalty: 250 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line38_underpayment_penalty, 250);
});

Deno.test("f2210.compute: underpayment_penalty zero — no output", () => {
  const result = compute({ underpayment_penalty: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Safe Harbor Rules
// =============================================================================

Deno.test("f2210.compute: 90% current year tax safe harbor met — no penalty", () => {
  // Tax = $10,000; 90% = $9,000; withholding = $9,000 → safe harbor
  const result = compute({
    withholding: 9000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2210.compute: 100% prior year tax safe harbor met (AGI <= $150k) — no penalty", () => {
  // Prior tax = $8,000; withholding = $8,000; prior AGI = $100k → 100% safe harbor
  const result = compute({
    withholding: 8000,
    prior_year_tax: 8000,
    prior_year_agi: 100000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2210.compute: 110% rule applies when prior AGI > $150k", () => {
  // Prior AGI = $200k → 110% rule; prior tax = $10,000 → need $11,000; withholding = $10,500 < $11,000
  // But current year 90% = $9,000 < $10,500 → safe harbor met via current year 90% test
  const result = compute({
    withholding: 10500,
    current_year_tax: 10000,  // 90% = $9,000
    prior_year_tax: 10000,
    prior_year_agi: 200000,   // 110% = $11,000; $10,500 < $11,000
  });
  // Safe harbor: min(9000, 11000) = 9000; payments = 10500 >= 9000 → safe harbor
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Estimated Payment Aggregation
// =============================================================================

Deno.test("f2210.compute: all 4 quarterly payments summed for safe harbor check", () => {
  // $2000 withholding + 4 * $1000 quarterly = $6000 total; current tax $10000; 90% = $9000
  // $6000 < $9000 → no safe harbor; but no underpayment_penalty provided → no penalty output
  const result = compute({
    withholding: 2000,
    q1_estimated_payment: 1000,
    q2_estimated_payment: 1000,
    q3_estimated_payment: 1000,
    q4_estimated_payment: 1000,
    current_year_tax: 10000,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Informational Fields — no outputs
// =============================================================================

Deno.test("f2210.compute: annualized_method flag only — no outputs", () => {
  const result = compute({ annualized_method: true });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2210.compute: required_annual_payment only — no outputs", () => {
  const result = compute({ required_annual_payment: 5000 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("f2210.compute: throws on negative withholding", () => {
  assertThrows(() => compute({ withholding: -1 }), Error);
});

Deno.test("f2210.compute: throws on negative q2_estimated_payment", () => {
  assertThrows(() => compute({ q2_estimated_payment: -200 }), Error);
});

Deno.test("f2210.compute: throws on negative underpayment_penalty", () => {
  assertThrows(() => compute({ underpayment_penalty: -50 }), Error);
});

Deno.test("f2210.compute: zero values do not throw", () => {
  const result = compute({ withholding: 0, underpayment_penalty: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f2210.compute: smoke test — penalty provided routes correctly", () => {
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

  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line38_underpayment_penalty, 175);
});
