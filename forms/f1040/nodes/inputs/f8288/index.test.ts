import { assertEquals, assertThrows } from "@std/assert";
import { f8288, WithholdingRate } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    property_address: "123 Main St, Anytown, CA 90210",
    gross_sales_price: 500000,
    withholding_rate: WithholdingRate.RATE_15,
    amount_withheld: 75000,
    buyer_name: "John Smith",
    buyer_tin: "123-45-6789",
    disposition_date: "2025-06-15",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8288.compute({ taxYear: 2025 }, { f8288s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8288.inputSchema: valid minimal item passes", () => {
  const parsed = f8288.inputSchema.safeParse({ f8288s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8288.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8288.inputSchema.safeParse({ f8288s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: negative gross_sales_price fails", () => {
  const parsed = f8288.inputSchema.safeParse({
    f8288s: [minimalItem({ gross_sales_price: -100000 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: negative amount_withheld fails", () => {
  const parsed = f8288.inputSchema.safeParse({
    f8288s: [minimalItem({ amount_withheld: -5000 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: invalid withholding_rate fails", () => {
  const parsed = f8288.inputSchema.safeParse({
    f8288s: [minimalItem({ withholding_rate: "RATE_20" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: all valid withholding rates pass", () => {
  for (const rate of Object.values(WithholdingRate)) {
    const parsed = f8288.inputSchema.safeParse({ f8288s: [minimalItem({ withholding_rate: rate })] });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f8288.inputSchema: missing property_address fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).property_address;
  const parsed = f8288.inputSchema.safeParse({ f8288s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: missing buyer_name fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).buyer_name;
  const parsed = f8288.inputSchema.safeParse({ f8288s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: missing buyer_tin fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).buyer_tin;
  const parsed = f8288.inputSchema.safeParse({ f8288s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8288.inputSchema: missing disposition_date fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).disposition_date;
  const parsed = f8288.inputSchema.safeParse({ f8288s: [item] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("f8288.compute: 15% rate — amount_withheld routes to f1040 line25b", () => {
  const result = compute([minimalItem({ withholding_rate: WithholdingRate.RATE_15, amount_withheld: 75000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 75000);
});

Deno.test("f8288.compute: 10% rate — amount_withheld routes to f1040 line25b", () => {
  const result = compute([minimalItem({ withholding_rate: WithholdingRate.RATE_10, gross_sales_price: 800000, amount_withheld: 80000 })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 80000);
});

Deno.test("f8288.compute: 0% rate, amount_withheld = 0 — no output", () => {
  const result = compute([minimalItem({ withholding_rate: WithholdingRate.RATE_0, gross_sales_price: 250000, amount_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8288.compute: amount_withheld = 0 — no output", () => {
  const result = compute([minimalItem({ amount_withheld: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — multiple items
// =============================================================================

Deno.test("f8288.compute: multiple properties — withheld amounts summed", () => {
  const result = compute([
    minimalItem({ amount_withheld: 75000 }),
    minimalItem({ amount_withheld: 30000, property_address: "456 Oak Ave, Portland, OR 97201" }),
  ]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 105000);
});

Deno.test("f8288.compute: multiple properties, one zero — only positive amounts count", () => {
  const result = compute([
    minimalItem({ amount_withheld: 50000 }),
    minimalItem({ withholding_rate: WithholdingRate.RATE_0, amount_withheld: 0, gross_sales_price: 200000 }),
  ]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 50000);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

Deno.test("f8288.compute: gross_sales_price < 300000 with 0% rate, zero withheld — no output", () => {
  const result = compute([minimalItem({
    gross_sales_price: 299999,
    withholding_rate: WithholdingRate.RATE_0,
    amount_withheld: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8288.compute: gross_sales_price at exactly 1000000 with 10% rate — routes", () => {
  const result = compute([minimalItem({
    gross_sales_price: 1000000,
    withholding_rate: WithholdingRate.RATE_10,
    amount_withheld: 100000,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 100000);
});

Deno.test("f8288.compute: gross_sales_price above 1000000 with 15% rate — routes", () => {
  const result = compute([minimalItem({
    gross_sales_price: 2000000,
    withholding_rate: WithholdingRate.RATE_15,
    amount_withheld: 300000,
  })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 300000);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8288.compute: throws on negative amount_withheld", () => {
  assertThrows(
    () => compute([minimalItem({ amount_withheld: -1000 })]),
    Error,
  );
});

Deno.test("f8288.compute: throws on negative gross_sales_price", () => {
  assertThrows(
    () => compute([minimalItem({ gross_sales_price: -500000 })]),
    Error,
  );
});

Deno.test("f8288.compute: zero amount_withheld does not throw", () => {
  const result = compute([minimalItem({ amount_withheld: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Edge Cases
// =============================================================================

Deno.test("f8288.compute: single item with minimum withheld (1) — routes", () => {
  const result = compute([minimalItem({ amount_withheld: 1 })]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 1);
});

Deno.test("f8288.compute: only one schedule1 output not emitted (routes to f1040 only)", () => {
  const result = compute([minimalItem({ amount_withheld: 50000 })]);
  const schedule1Out = result.outputs.find((o) => o.nodeType === "schedule1");
  assertEquals(schedule1Out, undefined);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("f8288.compute: smoke test — two properties, different rates, correct sum", () => {
  const result = compute([
    minimalItem({
      property_address: "100 Sunset Blvd, Los Angeles, CA 90028",
      gross_sales_price: 2500000,
      withholding_rate: WithholdingRate.RATE_15,
      amount_withheld: 375000,
      buyer_name: "Pacific Real Estate LLC",
      buyer_tin: "88-1234567",
      disposition_date: "2025-03-10",
    }),
    minimalItem({
      property_address: "200 Pine St, Seattle, WA 98101",
      gross_sales_price: 750000,
      withholding_rate: WithholdingRate.RATE_10,
      amount_withheld: 75000,
      buyer_name: "Northwest Home Buyers Inc",
      buyer_tin: "77-9876543",
      disposition_date: "2025-07-22",
    }),
  ]);
  // Total: 375000 + 75000 = 450000
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 450000);
  assertEquals(result.outputs.length, 1);
});
