import { assertEquals, assertThrows } from "@std/assert";
import { f9465 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f9465.compute(input as Parameters<typeof f9465.compute>[0]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f9465.inputSchema: empty input passes", () => {
  const parsed = f9465.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f9465.inputSchema: negative amount_owed fails", () => {
  const parsed = f9465.inputSchema.safeParse({ amount_owed: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f9465.inputSchema: negative monthly_payment fails", () => {
  const parsed = f9465.inputSchema.safeParse({ monthly_payment: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f9465.inputSchema: payment_day 0 fails (must be >= 1)", () => {
  const parsed = f9465.inputSchema.safeParse({ payment_day: 0 });
  assertEquals(parsed.success, false);
});

Deno.test("f9465.inputSchema: payment_day 29 fails (must be <= 28)", () => {
  const parsed = f9465.inputSchema.safeParse({ payment_day: 29 });
  assertEquals(parsed.success, false);
});

Deno.test("f9465.inputSchema: payment_day 1 passes", () => {
  const parsed = f9465.inputSchema.safeParse({ payment_day: 1 });
  assertEquals(parsed.success, true);
});

Deno.test("f9465.inputSchema: payment_day 28 passes", () => {
  const parsed = f9465.inputSchema.safeParse({ payment_day: 28 });
  assertEquals(parsed.success, true);
});

Deno.test("f9465.inputSchema: payment_day 15 passes", () => {
  const parsed = f9465.inputSchema.safeParse({ payment_day: 15 });
  assertEquals(parsed.success, true);
});

Deno.test("f9465.inputSchema: valid full input passes", () => {
  const parsed = f9465.inputSchema.safeParse({
    amount_owed: 5000,
    monthly_payment: 250,
    payment_day: 15,
    bank_routing_number: "021000021",
    bank_account_number: "123456789",
    direct_debit: true,
    prior_installment_agreement: false,
    low_income: false,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f9465.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: amount_owed set — no tax outputs", () => {
  const result = compute({ amount_owed: 10000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: monthly_payment set — no tax outputs", () => {
  const result = compute({ monthly_payment: 500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: all fields set — no tax outputs", () => {
  const result = compute({
    amount_owed: 5000,
    monthly_payment: 200,
    payment_day: 1,
    bank_routing_number: "021000021",
    bank_account_number: "987654321",
    direct_debit: true,
    low_income: true,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: direct_debit false — no tax outputs", () => {
  const result = compute({ direct_debit: false, monthly_payment: 300 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: low_income true — no tax outputs", () => {
  const result = compute({ low_income: true });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f9465.compute: prior_installment_agreement true — no tax outputs", () => {
  const result = compute({ prior_installment_agreement: true });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation (schema boundary)
// =============================================================================

Deno.test("f9465.compute: throws on negative amount_owed", () => {
  assertThrows(() => compute({ amount_owed: -100 }), Error);
});

Deno.test("f9465.compute: throws on negative monthly_payment", () => {
  assertThrows(() => compute({ monthly_payment: -50 }), Error);
});

Deno.test("f9465.compute: throws on payment_day 0", () => {
  assertThrows(() => compute({ payment_day: 0 }), Error);
});

Deno.test("f9465.compute: throws on payment_day 29", () => {
  assertThrows(() => compute({ payment_day: 29 }), Error);
});

Deno.test("f9465.compute: zero values do not throw", () => {
  const result = compute({ amount_owed: 0, monthly_payment: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f9465.compute: smoke test — full installment agreement fields produce no outputs", () => {
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
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});
