import { assertEquals, assertThrows } from "@std/assert";
import { ReasonForClaim, TaxType, f843 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f843.compute({ taxYear: 2025 }, input as Parameters<typeof f843.compute>[1]);
}

// =============================================================================
// 1. Input Schema — required and boundary rules
// =============================================================================

Deno.test("f843.inputSchema: empty input passes (all fields optional)", () => {
  const parsed = f843.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f843.inputSchema: negative amount_to_be_refunded fails", () => {
  const parsed = f843.inputSchema.safeParse({ amount_to_be_refunded: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f843.inputSchema: invalid tax_type 'income' fails (income tax excluded)", () => {
  const parsed = f843.inputSchema.safeParse({ tax_type: "income" });
  assertEquals(parsed.success, false);
});

Deno.test("f843.inputSchema: all TaxType enum values are accepted", () => {
  for (const taxType of Object.values(TaxType)) {
    const parsed = f843.inputSchema.safeParse({ tax_type: taxType });
    assertEquals(parsed.success, true, `TaxType.${taxType} should be valid`);
  }
});

Deno.test("f843.inputSchema: all ReasonForClaim enum values are accepted", () => {
  for (const reason of Object.values(ReasonForClaim)) {
    const parsed = f843.inputSchema.safeParse({ reason_for_claim: reason });
    assertEquals(parsed.success, true, `ReasonForClaim.${reason} should be valid`);
  }
});

Deno.test("f843.inputSchema: invalid reason_for_claim fails", () => {
  const parsed = f843.inputSchema.safeParse({ reason_for_claim: "bad_value" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Administrative Form — always produces no outputs
// =============================================================================

Deno.test("f843.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs, []);
});

Deno.test("f843.compute: amount_to_be_refunded set — no tax outputs (administrative form only)", () => {
  const result = compute({ amount_to_be_refunded: 5000 });
  assertEquals(result.outputs, []);
});

Deno.test("f843.compute: zero amount_to_be_refunded — no outputs", () => {
  const result = compute({ amount_to_be_refunded: 0 });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Hard Validation (schema boundary enforced at compute time)
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

// =============================================================================
// 4. Smoke Test — full claim fields, still no outputs
// =============================================================================

Deno.test("f843.compute: smoke test — full claim fields produce no outputs", () => {
  const result = compute({
    calendar_year: 2024,
    tax_type: TaxType.Employment,
    period_from: "2024-01-01",
    period_to: "2024-12-31",
    amount_to_be_refunded: 1500,
    reason_for_claim: ReasonForClaim.IrsError,
    penalty_section: "6651(a)(1)",
    explanation: "Penalty was assessed in error due to timely payment.",
  });
  assertEquals(result.outputs, []);
});
