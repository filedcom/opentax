import { assertEquals, assertThrows } from "@std/assert";
import { f8801 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

function compute(input: Record<string, unknown>) {
  return f8801.compute({ taxYear: 2025 }, input as Parameters<typeof f8801.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8801.inputSchema: empty input passes", () => {
  const parsed = f8801.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8801.inputSchema: valid full input passes", () => {
  const parsed = f8801.inputSchema.safeParse({
    prior_year_amt_paid: 5000,
    prior_year_carryforward: 2000,
    current_year_regular_tax: 20000,
    current_year_tmt: 14000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8801.inputSchema: negative prior_year_amt_paid fails", () => {
  const parsed = f8801.inputSchema.safeParse({ prior_year_amt_paid: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8801.inputSchema: negative prior_year_carryforward fails", () => {
  const parsed = f8801.inputSchema.safeParse({ prior_year_carryforward: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8801.inputSchema: negative current_year_regular_tax fails", () => {
  const parsed = f8801.inputSchema.safeParse({ current_year_regular_tax: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8801.inputSchema: negative current_year_tmt fails", () => {
  const parsed = f8801.inputSchema.safeParse({ current_year_tmt: -50 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Zero / No Output Cases
// =============================================================================

Deno.test("f8801.compute: empty input — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8801.compute: available_credit is zero — no output", () => {
  // Both prior_year fields omitted → available_credit = 0
  const result = compute({
    current_year_regular_tax: 20000,
    current_year_tmt: 10000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8801.compute: regular_tax equals tmt — excess is zero, no output", () => {
  // Excess = 0 → credit_allowed = 0
  const result = compute({
    prior_year_amt_paid: 5000,
    current_year_regular_tax: 15000,
    current_year_tmt: 15000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8801.compute: regular_tax less than tmt — excess is zero, no output", () => {
  // regular_tax < tmt → excess = max(0, ...) = 0
  const result = compute({
    prior_year_amt_paid: 3000,
    current_year_regular_tax: 10000,
    current_year_tmt: 12000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8801.compute: zero prior_year_amt_paid and zero carryforward — no output", () => {
  const result = compute({
    prior_year_amt_paid: 0,
    prior_year_carryforward: 0,
    current_year_regular_tax: 20000,
    current_year_tmt: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Credit Calculation — Full Credit Used
// =============================================================================

Deno.test("f8801.compute: excess > available_credit — full credit allowed", () => {
  // available = 3000; excess = 20000 - 10000 = 10000; credit = min(3000, 10000) = 3000
  const result = compute({
    prior_year_amt_paid: 3000,
    current_year_regular_tax: 20000,
    current_year_tmt: 10000,
  });
  assertEquals(result.outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 3000);
});

Deno.test("f8801.compute: carryforward only — full credit allowed when excess sufficient", () => {
  // available = 0 + 2500 = 2500; excess = 15000 - 8000 = 7000; credit = 2500
  const result = compute({
    prior_year_carryforward: 2500,
    current_year_regular_tax: 15000,
    current_year_tmt: 8000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 2500);
});

Deno.test("f8801.compute: both prior_year_amt_paid and carryforward — sums correctly", () => {
  // available = 2000 + 3000 = 5000; excess = 20000 - 13000 = 7000; credit = 5000
  const result = compute({
    prior_year_amt_paid: 2000,
    prior_year_carryforward: 3000,
    current_year_regular_tax: 20000,
    current_year_tmt: 13000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 5000);
});

// =============================================================================
// 4. Credit Calculation — Partial Credit (Excess Limits Credit)
// =============================================================================

Deno.test("f8801.compute: excess < available_credit — partial credit, limited by excess", () => {
  // available = 8000; excess = 20000 - 18000 = 2000; credit = min(8000, 2000) = 2000
  const result = compute({
    prior_year_amt_paid: 8000,
    current_year_regular_tax: 20000,
    current_year_tmt: 18000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 2000);
});

Deno.test("f8801.compute: tmt is zero — excess equals regular_tax", () => {
  // tmt = 0 (no AMT this year); available = 4000; excess = 10000; credit = 4000
  const result = compute({
    prior_year_amt_paid: 4000,
    current_year_regular_tax: 10000,
    current_year_tmt: 0,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 4000);
});

// =============================================================================
// 5. Output Routing
// =============================================================================

Deno.test("f8801.compute: credit routes to schedule3 node", () => {
  const result = compute({
    prior_year_amt_paid: 1000,
    current_year_regular_tax: 10000,
    current_year_tmt: 5000,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
});

Deno.test("f8801.compute: credit field is line6e_prior_year_min_tax_credit", () => {
  const result = compute({
    prior_year_amt_paid: 1500,
    current_year_regular_tax: 10000,
    current_year_tmt: 3000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 1500);
});

// =============================================================================
// 6. Throw Rules
// =============================================================================

Deno.test("f8801.compute: throws on negative prior_year_amt_paid", () => {
  assertThrows(() => compute({ prior_year_amt_paid: -1 }), Error);
});

Deno.test("f8801.compute: throws on negative prior_year_carryforward", () => {
  assertThrows(() => compute({ prior_year_carryforward: -500 }), Error);
});

Deno.test("f8801.compute: throws on negative current_year_regular_tax", () => {
  assertThrows(() => compute({ current_year_regular_tax: -100 }), Error);
});

Deno.test("f8801.compute: throws on negative current_year_tmt", () => {
  assertThrows(() => compute({ current_year_tmt: -1 }), Error);
});

Deno.test("f8801.compute: zero values do not throw", () => {
  const result = compute({
    prior_year_amt_paid: 0,
    prior_year_carryforward: 0,
    current_year_regular_tax: 0,
    current_year_tmt: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("f8801.compute: smoke test — realistic scenario", () => {
  // Taxpayer paid $6,000 AMT last year and has $1,000 carryforward.
  // This year: regular tax $25,000, TMT $18,000 → excess $7,000
  // credit = min(7000, 7000) = 7000
  const result = compute({
    prior_year_amt_paid: 6000,
    prior_year_carryforward: 1000,
    current_year_regular_tax: 25000,
    current_year_tmt: 18000,
  });
  assertEquals(result.outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 7000);
});

Deno.test("f8801.compute: smoke test — partial credit scenario", () => {
  // available = 10000; excess = 22000 - 20000 = 2000; credit = 2000 (partial)
  const result = compute({
    prior_year_amt_paid: 10000,
    current_year_regular_tax: 22000,
    current_year_tmt: 20000,
  });
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6e_prior_year_min_tax_credit, 2000);
});
