import { assertEquals, assertThrows } from "@std/assert";
import { sales_tax_deduction } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA } from "../schedule_a/index.ts";

function compute(input: Record<string, unknown>) {
  return sales_tax_deduction.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof sales_tax_deduction.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Validation
// =============================================================================

Deno.test("sales_tax_deduction.inputSchema: actual method with amount passes", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "actual",
    actual_sales_tax_paid: 1500,
  });
  assertEquals(parsed.success, true);
});

Deno.test("sales_tax_deduction.inputSchema: table method with amount passes", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "table",
    table_amount: 1200,
  });
  assertEquals(parsed.success, true);
});

Deno.test("sales_tax_deduction.inputSchema: invalid method fails", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "invalid",
    actual_sales_tax_paid: 1000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("sales_tax_deduction.inputSchema: negative actual_sales_tax_paid fails", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "actual",
    actual_sales_tax_paid: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("sales_tax_deduction.inputSchema: negative table_amount fails", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "table",
    table_amount: -500,
  });
  assertEquals(parsed.success, false);
});

Deno.test("sales_tax_deduction.inputSchema: negative major_purchase_tax fails", () => {
  const parsed = sales_tax_deduction.inputSchema.safeParse({
    method: "table",
    table_amount: 1000,
    major_purchase_tax: -200,
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Actual method routing
// =============================================================================

Deno.test("sales_tax_deduction.compute: actual method routes to schedule_a.line_5a_sales_tax", () => {
  const result = compute({ method: "actual", actual_sales_tax_paid: 1500 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 1500);
});

Deno.test("sales_tax_deduction.compute: actual method — zero amount produces no output", () => {
  const result = compute({ method: "actual", actual_sales_tax_paid: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("sales_tax_deduction.compute: actual method — missing actual_sales_tax_paid treated as zero, no output", () => {
  const result = compute({ method: "actual" });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Table method routing
// =============================================================================

Deno.test("sales_tax_deduction.compute: table method routes table_amount to schedule_a", () => {
  const result = compute({ method: "table", table_amount: 1200 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 1200);
});

Deno.test("sales_tax_deduction.compute: table method — zero table_amount produces no output", () => {
  const result = compute({ method: "table", table_amount: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Major purchase add-on (table method only)
// =============================================================================

Deno.test("sales_tax_deduction.compute: table method + major_purchase_tax adds to total", () => {
  const result = compute({ method: "table", table_amount: 1200, major_purchase_tax: 800 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 2000);
});

Deno.test("sales_tax_deduction.compute: table method with zero major_purchase_tax — only table amount", () => {
  const result = compute({ method: "table", table_amount: 1200, major_purchase_tax: 0 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 1200);
});

Deno.test("sales_tax_deduction.compute: actual method ignores major_purchase_tax field", () => {
  // For actual method, major_purchase_tax is already included in actual_sales_tax_paid
  const result = compute({ method: "actual", actual_sales_tax_paid: 2000, major_purchase_tax: 500 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  // Actual method: uses only actual_sales_tax_paid (500 is assumed already included)
  assertEquals(fields.line_5a_sales_tax, 2000);
});

// =============================================================================
// 5. Output routing — routes to schedule_a
// =============================================================================

Deno.test("sales_tax_deduction.compute: routes to schedule_a with correct amount", () => {
  const result = compute({ method: "actual", actual_sales_tax_paid: 1000 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 1000);
});

Deno.test("sales_tax_deduction.compute: produces exactly one output", () => {
  const result = compute({ method: "table", table_amount: 1000, major_purchase_tax: 200 });
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 6. Hard validation
// =============================================================================

Deno.test("sales_tax_deduction.compute: throws on invalid method", () => {
  assertThrows(() => compute({ method: "invalid", actual_sales_tax_paid: 1000 }), Error);
});

Deno.test("sales_tax_deduction.compute: throws on negative actual_sales_tax_paid", () => {
  assertThrows(() => compute({ method: "actual", actual_sales_tax_paid: -500 }), Error);
});

// =============================================================================
// 7. Edge cases
// =============================================================================

Deno.test("sales_tax_deduction.compute: table method with only major_purchase_tax (no table_amount) — routes major purchase only", () => {
  const result = compute({ method: "table", table_amount: 0, major_purchase_tax: 600 });
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 600);
});

// =============================================================================
// 8. Smoke test
// =============================================================================

Deno.test("sales_tax_deduction.compute: smoke test — table method with major purchase", () => {
  const result = compute({
    method: "table",
    table_amount: 1400,
    major_purchase_tax: 1200,
  });
  // 1400 + 1200 = 2600
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_5a_sales_tax, 2600);
  assertEquals(result.outputs.length, 1);
});
