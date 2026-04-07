import { assertEquals, assertThrows } from "@std/assert";
import { f9465 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f9465.compute({ taxYear: 2025 }, input as Parameters<typeof f9465.compute>[1]);
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f9465.inputSchema: rejects negative amount_owed", () => {
  assertEquals(f9465.inputSchema.safeParse({ amount_owed: -1 }).success, false);
});

Deno.test("f9465.inputSchema: payment_day must be 1–28", () => {
  assertEquals(f9465.inputSchema.safeParse({ payment_day: 0 }).success, false);
  assertEquals(f9465.inputSchema.safeParse({ payment_day: 29 }).success, false);
  assertEquals(f9465.inputSchema.safeParse({ payment_day: 1 }).success, true);
  assertEquals(f9465.inputSchema.safeParse({ payment_day: 28 }).success, true);
});

// =============================================================================
// Administrative Form — always produces no tax outputs
// =============================================================================

Deno.test("f9465.compute: empty input produces no outputs", () => {
  assertEquals(compute({}).outputs, []);
});

Deno.test("f9465.compute: amount_owed set — no tax outputs (admin form only)", () => {
  assertEquals(compute({ amount_owed: 10000 }).outputs, []);
});

Deno.test("f9465.compute: monthly_payment set — no tax outputs (no downstream routing)", () => {
  assertEquals(compute({ monthly_payment: 500 }).outputs, []);
});

Deno.test("f9465.compute: direct debit configuration — no tax outputs", () => {
  assertEquals(
    compute({
      amount_owed: 5000,
      monthly_payment: 250,
      payment_day: 15,
      bank_routing_number: "021000021",
      bank_account_number: "123456789",
      direct_debit: true,
    }).outputs,
    [],
  );
});

Deno.test("f9465.compute: low_income flag — no tax outputs (affects user fee only)", () => {
  assertEquals(compute({ low_income: true }).outputs, []);
});

Deno.test("f9465.compute: prior_installment_agreement flag — no tax outputs (affects user fee only)", () => {
  assertEquals(compute({ prior_installment_agreement: true }).outputs, []);
});

// =============================================================================
// Hard Validation (schema boundary)
// =============================================================================

Deno.test("f9465.compute: throws on negative amount_owed", () => {
  assertThrows(() => compute({ amount_owed: -100 }), Error);
});

Deno.test("f9465.compute: throws on payment_day out of range", () => {
  assertThrows(() => compute({ payment_day: 0 }), Error);
  assertThrows(() => compute({ payment_day: 29 }), Error);
});

Deno.test("f9465.compute: zero monetary values are valid", () => {
  assertEquals(compute({ amount_owed: 0, monthly_payment: 0 }).outputs, []);
});

// =============================================================================
// Full installment agreement — no tax routing regardless of all fields set
// =============================================================================

Deno.test("f9465.compute: full installment agreement produces no outputs", () => {
  const result = compute({
    amount_owed: 25000,
    monthly_payment: 1000,
    payment_day: 15,
    bank_routing_number: "021000021",
    bank_account_number: "555666777",
    direct_debit: true,
    prior_installment_agreement: false,
    low_income: false,
  });
  assertEquals(result.outputs, []);
});
