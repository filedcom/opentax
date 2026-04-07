import { assertEquals, assertThrows } from "@std/assert";
import { f1099c } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { form982 } from "../../intermediate/forms/form982/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    creditor_name: "Test Creditor",
    box2_cod_amount: 1000,
    routing: "taxable" as const,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099c.compute({ taxYear: 2025 }, { f1099cs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: negative box2_cod_amount fails", () => {
  const parsed = f1099c.inputSchema.safeParse({
    f1099cs: [{ creditor_name: "A", box2_cod_amount: -100 }],
  });
  assertEquals(parsed.success, false);
});

// ============================================================
// 2. Per-Box Routing
// ============================================================

Deno.test("routing=taxable routes box2 to schedule1 line8c", () => {
  const result = compute([minimalItem({ box2_cod_amount: 5000, routing: "taxable" })]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 5000);
});

Deno.test("routing=taxable: box2_cod_amount=0 does not route to schedule1", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0, routing: "taxable" })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("routing=excluded routes box2 to form982 line2", () => {
  const result = compute([minimalItem({ box2_cod_amount: 25000, routing: "excluded" })]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("routing=excluded does not emit schedule1", () => {
  const result = compute([minimalItem({ box2_cod_amount: 8000, routing: "excluded" })]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("routing=taxable does not emit form982", () => {
  const result = compute([minimalItem({ box2_cod_amount: 1200, routing: "taxable" })]);
  const f982 = findOutput(result, "form982");
  assertEquals(f982, undefined);
});

Deno.test("box7_fmv_property > 0 routes to schedule_d with both fmv and cod_debt_cancelled", () => {
  const result = compute([minimalItem({ box2_cod_amount: 10000, box7_fmv_property: 180000, routing: "taxable" })]);
  const input = fieldsOf(result.outputs, schedule_d)!;
  assertEquals(input.cod_property_fmv, 180000);
  assertEquals(input.cod_debt_cancelled, 10000);
});

Deno.test("box7_fmv_property = 0 does not route to schedule_d", () => {
  const result = compute([minimalItem({ box2_cod_amount: 3000, box7_fmv_property: 0, routing: "taxable" })]);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("omitted box7_fmv_property does not route to schedule_d", () => {
  const result = compute([minimalItem({ box2_cod_amount: 3000, routing: "taxable" })]);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("excluded routing + box7 present emits both form982 and schedule_d", () => {
  const result = compute([minimalItem({ box2_cod_amount: 50000, box7_fmv_property: 200000, routing: "excluded" })]);
  const f982Input = fieldsOf(result.outputs, form982)!;
  const sdInput = fieldsOf(result.outputs, schedule_d)!;
  assertEquals(f982Input.line2_excluded_cod, 50000);
  assertEquals(sdInput.cod_property_fmv, 200000);
  assertEquals(sdInput.cod_debt_cancelled, 50000);
});

Deno.test("empty array produces empty outputs", () => {
  const result = f1099c.compute({ taxYear: 2025 }, { f1099cs: [] });
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 3. Aggregation — all items in one compute() call
// ============================================================

Deno.test("aggregation: multiple taxable items sum box2 on schedule1 line8c", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 4000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 7000);
});

Deno.test("aggregation: multiple excluded items sum box2 on form982 line2", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 10000, routing: "excluded" }),
    minimalItem({ box2_cod_amount: 15000, routing: "excluded" }),
  ]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("aggregation: mixed taxable and excluded items route separately with correct amounts", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 8000, routing: "excluded" }),
  ]);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(s1Input.line8c_cod_income, 5000);
  assertEquals(f982Input.line2_excluded_cod, 8000);
});

Deno.test("aggregation: three taxable items — total is sum of all three", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 1000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 2000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 6000);
});

Deno.test("aggregation: multiple items one zero — only non-zero items contribute", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 5000);
});

// ============================================================
// 4. Hard Validation Rules
// ============================================================

Deno.test("validation: box2_cod_amount negative throws", () => {
  assertThrows(() => compute([minimalItem({ box2_cod_amount: -1 })]));
});

Deno.test("validation: box7_fmv_property negative throws", () => {
  assertThrows(() => compute([minimalItem({ box7_fmv_property: -1 })]));
});

// ============================================================
// 5. Edge Cases
// ============================================================

Deno.test("edge: routing=excluded with box2=0 produces no form982 output", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0, routing: "excluded" })]);
  const f982 = findOutput(result, "form982");
  assertEquals(f982, undefined);
});

Deno.test("edge: excluded routing preserves exact decimal amounts", () => {
  const result = compute([minimalItem({ box2_cod_amount: 12345.67, routing: "excluded" })]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 12345.67);
});

Deno.test("edge: large excluded amount ($750,000) routes full amount to form982", () => {
  // The f1099c node passes the full box2 to form982; cap enforcement deferred to form982 node
  const result = compute([minimalItem({ box2_cod_amount: 750_000, routing: "excluded" })]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 750_000);
});

Deno.test("edge: two items with box7, each generates own schedule_d entry", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 5000, box7_fmv_property: 120000, routing: "taxable" }),
  ]);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 8000);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
});

// ============================================================
// 6. Smoke Tests
// ============================================================

Deno.test("smoke: taxable personal debt — routes to schedule1, not form982 or schedule_d", () => {
  const result = compute([
    minimalItem({
      creditor_name: "Capital One Bank",
      box2_cod_amount: 15000,
      routing: "taxable",
    }),
  ]);

  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 15000);
  assertEquals(findOutput(result, "form982"), undefined);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("smoke: excluded QPRI debt with property — form982 and schedule_d, not schedule1", () => {
  const result = compute([
    minimalItem({
      creditor_name: "Wells Fargo Mortgage",
      box2_cod_amount: 50000,
      box7_fmv_property: 220000,
      routing: "excluded",
    }),
  ]);

  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 50000);
  const sdInput = fieldsOf(result.outputs, schedule_d)!;
  assertEquals(sdInput.cod_property_fmv, 220000);
  assertEquals(sdInput.cod_debt_cancelled, 50000);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("smoke: multiple 1099-Cs in same year, mixed routing — correct amounts on each form", () => {
  const result = compute([
    minimalItem({ creditor_name: "Personal Lender", box2_cod_amount: 8000, routing: "taxable" }),
    minimalItem({ creditor_name: "Mortgage Bank", box2_cod_amount: 20000, routing: "excluded" }),
  ]);

  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 8000);
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 20000);
});
