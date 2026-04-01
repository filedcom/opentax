import { assertEquals, assertThrows } from "@std/assert";
import { f843 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f843.compute({ taxYear: 2025 }, input as Parameters<typeof f843.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f843.inputSchema: empty input passes", () => {
  const parsed = f843.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid calendar_year passes", () => {
  const parsed = f843.inputSchema.safeParse({ calendar_year: 2024 });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: negative amount_to_be_refunded fails", () => {
  const parsed = f843.inputSchema.safeParse({ amount_to_be_refunded: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f843.inputSchema: valid tax_type employment passes", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "employment" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid tax_type estate passes", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "estate" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid tax_type gift passes", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "gift" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid tax_type excise passes", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "excise" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: invalid tax_type fails", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "income" });
  assertEquals(parsed.success, false);
});

Deno.test("f843.inputSchema: valid reason_for_claim irs_error passes", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "irs_error" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid reason_for_claim erroneous_written_advice passes", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "erroneous_written_advice" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid reason_for_claim reasonable_cause passes", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "reasonable_cause" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: valid reason_for_claim other passes", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "other" });
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: invalid reason_for_claim fails", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "bad_value" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f843.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f843.compute: amount_to_be_refunded set — no tax outputs", () => {
  const result = compute({ amount_to_be_refunded: 5000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f843.compute: tax_type employment — no tax outputs", () => {
  const result = compute({ tax_type: "employment" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f843.compute: reason_for_claim irs_error — no tax outputs", () => {
  const result = compute({ reason_for_claim: "irs_error" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f843.compute: explanation set — no tax outputs", () => {
  const result = compute({ explanation: "IRS charged interest incorrectly." });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation (schema boundary)
// =============================================================================

Deno.test("f843.compute: throws on negative amount_to_be_refunded", () => {
  assertThrows(() => compute({ amount_to_be_refunded: -1 }), Error);
});

Deno.test("f843.compute: throws on invalid tax_type", () => {
  assertThrows(() => compute({ tax_type: "income" }), Error);
});

Deno.test("f843.compute: throws on invalid reason_for_claim", () => {
  assertThrows(() => compute({ reason_for_claim: "bogus" }), Error);
});

Deno.test("f843.compute: zero amount_to_be_refunded does not throw", () => {
  const result = compute({ amount_to_be_refunded: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f843.compute: smoke test — full claim fields produce no outputs", () => {
  const result = compute({
    calendar_year: 2024,
    tax_type: "employment",
    period_from: "2024-01-01",
    period_to: "2024-12-31",
    amount_to_be_refunded: 1500,
    reason_for_claim: "irs_error",
    penalty_section: "6651(a)(1)",
    explanation: "Penalty was assessed in error due to timely payment.",
  });
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});
