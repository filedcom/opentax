import { assertEquals, assertThrows } from "@std/assert";
import { f1099patr } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099patr.compute({ f1099patrs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f1099patr.inputSchema: valid empty item passes", () => {
  const parsed = f1099patr.inputSchema.safeParse({ f1099patrs: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f1099patr.inputSchema: negative box1_patronage_dividends fails", () => {
  const parsed = f1099patr.inputSchema.safeParse({ f1099patrs: [{ box1_patronage_dividends: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f1099patr.inputSchema: negative box2_nonpatronage_distributions fails", () => {
  const parsed = f1099patr.inputSchema.safeParse({ f1099patrs: [{ box2_nonpatronage_distributions: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f1099patr.inputSchema: negative box4_federal_withheld fails", () => {
  const parsed = f1099patr.inputSchema.safeParse({ f1099patrs: [{ box4_federal_withheld: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f1099patr.inputSchema: empty array fails (min 1)", () => {
  const parsed = f1099patr.inputSchema.safeParse({ f1099patrs: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f1099patr.inputSchema: valid full item passes", () => {
  const parsed = f1099patr.inputSchema.safeParse({
    f1099patrs: [{
      box1_patronage_dividends: 500,
      box2_nonpatronage_distributions: 100,
      box3_per_unit_retain: 50,
      box4_federal_withheld: 125,
      box7_qualified_payments: 300,
      trade_or_business: false,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Box Routing
// =============================================================================

Deno.test("f1099patr.compute: box1_patronage_dividends (non-business) routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box1_patronage_dividends: 800 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 800);
});

Deno.test("f1099patr.compute: box2_nonpatronage_distributions routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box2_nonpatronage_distributions: 400 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 400);
});

Deno.test("f1099patr.compute: box3_per_unit_retain routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box3_per_unit_retain: 200 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 200);
});

Deno.test("f1099patr.compute: box4_federal_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 250 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 250);
});

Deno.test("f1099patr.compute: box4_federal_withheld zero — no f1040 output", () => {
  const result = compute([minimalItem({ box4_federal_withheld: 0 })]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f1099patr.compute: empty item produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Business vs. Non-Business Routing
// =============================================================================

Deno.test("f1099patr.compute: trade_or_business=true — box1 does NOT route to schedule1 other income", () => {
  const result = compute([minimalItem({ box1_patronage_dividends: 1000, trade_or_business: true })]);
  const out = result.outputs.find(
    (o) => o.nodeType === "schedule1" &&
      (o.fields as Record<string, unknown>).line8z_other_income !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("f1099patr.compute: trade_or_business=false — box1 routes to schedule1 other income", () => {
  const result = compute([minimalItem({ box1_patronage_dividends: 1000, trade_or_business: false })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 1000);
});

Deno.test("f1099patr.compute: trade_or_business omitted — defaults to non-business routing", () => {
  const result = compute([minimalItem({ box1_patronage_dividends: 600 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 600);
});

// =============================================================================
// 4. Aggregation
// =============================================================================

Deno.test("f1099patr.compute: multiple items — box1 summed for non-business items", () => {
  const result = compute([
    minimalItem({ box1_patronage_dividends: 500 }),
    minimalItem({ box1_patronage_dividends: 300 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 800);
});

Deno.test("f1099patr.compute: multiple items — box4 withheld summed to f1040", () => {
  const result = compute([
    minimalItem({ box4_federal_withheld: 100 }),
    minimalItem({ box4_federal_withheld: 150 }),
  ]);
  const fields = fieldsOf(result.outputs, f1040)!;
  assertEquals(fields.line25b_withheld_1099, 250);
});

Deno.test("f1099patr.compute: box1 + box2 + box3 combined for non-business total", () => {
  const result = compute([
    minimalItem({ box1_patronage_dividends: 100, box2_nonpatronage_distributions: 200, box3_per_unit_retain: 50 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other_income, 350);
});

// =============================================================================
// 5. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("f1099patr.compute: box7_qualified_payments only — no outputs", () => {
  const result = compute([minimalItem({ box7_qualified_payments: 1000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099patr.compute: box6_dpad only — no outputs (expired deduction)", () => {
  const result = compute([minimalItem({ box6_dpad: 500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099patr.compute: box8_qualified_written_notice only — no outputs", () => {
  const result = compute([minimalItem({ box8_qualified_written_notice: 300 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1099patr.compute: payer_name and payer_tin only — no outputs", () => {
  const result = compute([minimalItem({ payer_name: "Farm Co-op", payer_tin: "34-1234567" })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Hard Validation Rules
// =============================================================================

Deno.test("f1099patr.compute: throws on negative box1_patronage_dividends", () => {
  assertThrows(() => compute([minimalItem({ box1_patronage_dividends: -1 })]), Error);
});

Deno.test("f1099patr.compute: throws on negative box4_federal_withheld", () => {
  assertThrows(() => compute([minimalItem({ box4_federal_withheld: -100 })]), Error);
});

Deno.test("f1099patr.compute: zero values do not throw", () => {
  const result = compute([minimalItem({ box1_patronage_dividends: 0, box4_federal_withheld: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f1099patr.compute: mixed business and non-business items", () => {
  const result = compute([
    minimalItem({ box1_patronage_dividends: 1000, trade_or_business: true }),
    minimalItem({ box1_patronage_dividends: 500 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  // Only non-business $500 routes to other income
  assertEquals(fields.line8z_other_income, 500);
});

Deno.test("f1099patr.compute: all items are business — no schedule1 output", () => {
  const result = compute([
    minimalItem({ box1_patronage_dividends: 2000, trade_or_business: true }),
  ]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f1099patr.compute: smoke test — multiple patrs with mixed fields", () => {
  const result = compute([
    minimalItem({
      box1_patronage_dividends: 800,
      box2_nonpatronage_distributions: 150,
      box3_per_unit_retain: 50,
      box4_federal_withheld: 200,
      box7_qualified_payments: 400,
      trade_or_business: false,
      payer_name: "Rural Farm Co-op",
    }),
    minimalItem({
      box1_patronage_dividends: 500,
      box4_federal_withheld: 125,
      trade_or_business: false,
    }),
  ]);

  const s1 = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1.line8z_other_income, 1500); // 800+150+50 + 500

  const f = fieldsOf(result.outputs, f1040)!;
  assertEquals(f.line25b_withheld_1099, 325);
});
