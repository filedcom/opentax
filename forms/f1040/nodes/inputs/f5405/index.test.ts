import { assertEquals, assertThrows } from "@std/assert";
import { f5405 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    credit_year: 2008,
    original_credit_amount: 7500,
    repayments_already_made: 0,
    sold_or_disposed: false,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f5405.compute({ taxYear: 2025, formType: "f1040" }, { f5405s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f5405.inputSchema: valid minimal item passes", () => {
  const parsed = f5405.inputSchema.safeParse({
    f5405s: [minimalItem()],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f5405.inputSchema: empty array fails (min 1)", () => {
  const parsed = f5405.inputSchema.safeParse({ f5405s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f5405.inputSchema: negative original_credit_amount fails", () => {
  const parsed = f5405.inputSchema.safeParse({
    f5405s: [minimalItem({ original_credit_amount: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5405.inputSchema: negative repayments_already_made fails", () => {
  const parsed = f5405.inputSchema.safeParse({
    f5405s: [minimalItem({ repayments_already_made: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5405.inputSchema: wrong credit_year fails validation at compute time", () => {
  assertThrows(() => compute([minimalItem({ credit_year: 2009 })]), Error);
});

Deno.test("f5405.inputSchema: valid full item passes", () => {
  const parsed = f5405.inputSchema.safeParse({
    f5405s: [minimalItem({
      repayments_already_made: 7000,
      sold_or_disposed: true,
      disposal_year: 2025,
      home_destroyed: false,
    })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Standard Annual Installment ($500/year)
// =============================================================================

Deno.test("f5405.compute: standard installment with no prior repayments → $500 to schedule2", () => {
  const result = compute([minimalItem({ repayments_already_made: 0, sold_or_disposed: false })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 500);
});

Deno.test("f5405.compute: standard installment with partial prior repayments → $500", () => {
  // Still has balance: 7500 - 5000 = 2500 remaining; installment = min(500, 2500)
  const result = compute([minimalItem({ repayments_already_made: 5000, sold_or_disposed: false })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 500);
});

Deno.test("f5405.compute: standard installment when remaining balance < $500 → routes remaining", () => {
  // 7500 - 7200 = 300 remaining; installment = min(500, 300) = 300
  const result = compute([minimalItem({ repayments_already_made: 7200, sold_or_disposed: false })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 300);
});

// =============================================================================
// 3. Disposal — Full Remaining Balance Due
// =============================================================================

Deno.test("f5405.compute: sold_or_disposed=true → full remaining balance due", () => {
  // 7500 - 2000 = 5500 remaining; disposal → full 5500 due
  const result = compute([minimalItem({ repayments_already_made: 2000, sold_or_disposed: true })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 5500);
});

Deno.test("f5405.compute: sold_or_disposed=true with no prior repayments → full $7500 due", () => {
  const result = compute([minimalItem({ repayments_already_made: 0, sold_or_disposed: true })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 7500);
});

Deno.test("f5405.compute: home_destroyed=true → full remaining balance due", () => {
  // 7500 - 3000 = 4500 remaining; destruction → full 4500 due
  const result = compute([minimalItem({
    repayments_already_made: 3000,
    sold_or_disposed: false,
    home_destroyed: true,
  })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 4500);
});

// =============================================================================
// 4. Zero Repayment — No Output
// =============================================================================

Deno.test("f5405.compute: fully repaid credit → no output", () => {
  // 7500 - 7500 = 0 remaining; no repayment due
  const result = compute([minimalItem({ repayments_already_made: 7500, sold_or_disposed: false })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5405.compute: repayments exceed original → no output (floor at 0)", () => {
  const result = compute([minimalItem({ repayments_already_made: 8000, sold_or_disposed: false })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5405.compute: sold_or_disposed=true but fully repaid → no output", () => {
  const result = compute([minimalItem({ repayments_already_made: 7500, sold_or_disposed: true })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Aggregation — Multiple Form 5405 Instances
// =============================================================================

Deno.test("f5405.compute: multiple items — repayment amounts summed into single schedule2 output", () => {
  // Item 1: 7500 - 7000 = 500 remaining, standard → 500
  // Item 2: 5000 - 0 = 5000 remaining, disposed → 5000
  const result = compute([
    minimalItem({ repayments_already_made: 7000, sold_or_disposed: false }),
    minimalItem({ original_credit_amount: 5000, repayments_already_made: 0, sold_or_disposed: true }),
  ]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 5500);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f5405.compute: throws on credit_year != 2008", () => {
  assertThrows(() => compute([minimalItem({ credit_year: 2009 })]), Error);
});

Deno.test("f5405.compute: credit_year=2008 does not throw", () => {
  const result = compute([minimalItem({ credit_year: 2008 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f5405.compute: original_credit_amount=0 → no repayment", () => {
  const result = compute([minimalItem({ original_credit_amount: 0, repayments_already_made: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5405.compute: disposal_year field present — does not affect calculation", () => {
  const result = compute([minimalItem({ sold_or_disposed: true, disposal_year: 2025, repayments_already_made: 6000 })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 1500);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f5405.compute: smoke test — mixed items", () => {
  const result = compute([
    // Standard annual installment: 7500 - 7000 = 500 remaining → $500
    minimalItem({
      original_credit_amount: 7500,
      repayments_already_made: 7000,
      sold_or_disposed: false,
    }),
    // Disposal: 6000 - 1000 = 5000 remaining → $5000
    minimalItem({
      original_credit_amount: 6000,
      repayments_already_made: 1000,
      sold_or_disposed: true,
      disposal_year: 2025,
    }),
    // Fully repaid: no output
    minimalItem({
      original_credit_amount: 7500,
      repayments_already_made: 7500,
      sold_or_disposed: false,
    }),
  ]);
  // Total = 500 + 5000 = 5500
  const out = findOutput(result, "schedule2");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line10_homebuyer_credit_repayment, 5500);
});
