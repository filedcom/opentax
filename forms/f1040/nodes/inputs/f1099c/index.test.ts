import { assertEquals, assertThrows } from "@std/assert";
import { f1099c } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { form982 } from "../../intermediate/form982/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

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

Deno.test("schema: missing box2_cod_amount throws", () => {
  assertThrows(() =>
    compute([{
      creditor_name: "Creditor",
      routing: "taxable",
    } as unknown as ReturnType<typeof minimalItem>])
  );
});

Deno.test("schema: negative box2_cod_amount throws", () => {
  assertThrows(() => compute([minimalItem({ box2_cod_amount: -100 })]));
});

Deno.test("schema: negative box7_fmv_property throws", () => {
  assertThrows(() => compute([minimalItem({ box7_fmv_property: -50 })]));
});

Deno.test("schema: valid minimal item does not throw", () => {
  const result = compute([minimalItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: empty array produces empty outputs", () => {
  const result = f1099c.compute({ taxYear: 2025 }, { f1099cs: [] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("schema: box2_cod_amount = 0 does not throw", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 2. Per-Box Routing
// ============================================================

Deno.test("routing=taxable routes box2 to schedule1 line8c", () => {
  const result = compute([minimalItem({ box2_cod_amount: 5000, routing: "taxable" })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
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
  const out = findOutput(result, "form982");
  assertEquals(out !== undefined, true);
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
  const form982 = findOutput(result, "form982");
  assertEquals(form982, undefined);
});

Deno.test("box7_fmv_property > 0 routes to schedule_d", () => {
  const result = compute([minimalItem({ box2_cod_amount: 10000, box7_fmv_property: 180000, routing: "taxable" })]);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
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
  const form982 = findOutput(result, "form982");
  const sd = findOutput(result, "schedule_d");
  assertEquals(form982 !== undefined, true);
  assertEquals(sd !== undefined, true);
});

// ============================================================
// 3. Aggregation — all items in one compute() call
// ============================================================

Deno.test("aggregation: multiple taxable items sum box2 on schedule1 line8c", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 4000, routing: "taxable" }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 7000);
});

Deno.test("aggregation: multiple excluded items sum box2 on form982 line2", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 10000, routing: "excluded" }),
    minimalItem({ box2_cod_amount: 15000, routing: "excluded" }),
  ]);
  const out = findOutput(result, "form982");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("aggregation: mixed taxable and excluded items route separately", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 8000, routing: "excluded" }),
  ]);
  const s1 = findOutput(result, "schedule1");
  const form982Out = findOutput(result, "form982");
  assertEquals(s1 !== undefined, true);
  assertEquals(form982Out !== undefined, true);
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
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 6000);
});

// ============================================================
// 4. Thresholds
// ============================================================

Deno.test("threshold: box2 below $600 ($599) still routes when entered", () => {
  // IRS threshold is for lender reporting obligation; taxpayer must still report
  const result = compute([minimalItem({ box2_cod_amount: 599, routing: "taxable" })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 599);
});

Deno.test("threshold: box2 at exactly $600 routes to schedule1", () => {
  const result = compute([minimalItem({ box2_cod_amount: 600, routing: "taxable" })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 600);
});

Deno.test("threshold: box2 above $600 routes to schedule1", () => {
  const result = compute([minimalItem({ box2_cod_amount: 601, routing: "taxable" })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 601);
});

Deno.test("threshold: large box2 ($1,000,000) routes full amount to form982 when excluded", () => {
  const result = compute([minimalItem({ box2_cod_amount: 1_000_000, routing: "excluded" })]);
  const out = findOutput(result, "form982");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 1_000_000);
});

// ============================================================
// 5. Hard Validation Rules
// ============================================================

Deno.test("validation: box2_cod_amount negative throws", () => {
  assertThrows(() => compute([minimalItem({ box2_cod_amount: -1 })]));
});

Deno.test("validation: box7_fmv_property negative throws", () => {
  assertThrows(() => compute([minimalItem({ box7_fmv_property: -1 })]));
});

Deno.test("validation: valid box2_cod_amount does not throw", () => {
  const result = compute([minimalItem({ box2_cod_amount: 1000 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("validation: box2_cod_amount = 0 does not throw (valid edge)", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 6. Warning-Only Rules (must NOT throw)
// ============================================================

Deno.test("warning: routing=taxable with box7 present does not throw", () => {
  const result = compute([minimalItem({ box2_cod_amount: 5000, box7_fmv_property: 100000, routing: "taxable" })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: routing=excluded without box7 does not throw", () => {
  const result = compute([minimalItem({ box2_cod_amount: 5000, routing: "excluded" })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning: multiple items with mixed routing do not throw", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 1000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 2000, routing: "excluded" }),
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 7. Informational Fields — output count unchanged
// ============================================================

Deno.test("informational: creditor_name does not affect output count", () => {
  const withName = compute([minimalItem({ creditor_name: "Big Bank Corp", box2_cod_amount: 5000, routing: "taxable" })]);
  const withoutName = compute([minimalItem({ creditor_name: "", box2_cod_amount: 5000, routing: "taxable" })]);
  assertEquals(withName.outputs.length, withoutName.outputs.length);
});

Deno.test("informational: box2_cod_amount value changes output but not presence when both > 0", () => {
  // Both should produce a schedule1 output
  const small = compute([minimalItem({ box2_cod_amount: 1, routing: "taxable" })]);
  const large = compute([minimalItem({ box2_cod_amount: 999999, routing: "taxable" })]);
  assertEquals(small.outputs.length, large.outputs.length);
});

// ============================================================
// 8. Edge Cases
// ============================================================

Deno.test("edge: routing=taxable with box2=0 produces no schedule1 output (nothing to report)", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0, routing: "taxable" })]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("edge: routing=excluded with box2=0 produces no form982 output", () => {
  const result = compute([minimalItem({ box2_cod_amount: 0, routing: "excluded" })]);
  const form982 = findOutput(result, "form982");
  assertEquals(form982, undefined);
});

Deno.test("edge: multiple items where one has box2=0 — only non-zero items contribute to total", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 5000);
});

Deno.test("edge: multiple items all with box2=0 produce no schedule1 output", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("edge: excluded routing preserves exact decimal amounts", () => {
  const result = compute([minimalItem({ box2_cod_amount: 12345.67, routing: "excluded" })]);
  const out = findOutput(result, "form982");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 12345.67);
});

Deno.test("edge: large excluded amount ($750,000 QPRI cap scenario) routes full amount to form982", () => {
  // The 99C node passes the full box2 to form982; cap enforcement deferred to form982 node
  const result = compute([minimalItem({ box2_cod_amount: 750_000, routing: "excluded" })]);
  const out = findOutput(result, "form982");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 750_000);
});

Deno.test("edge: box7 with excluded routing — schedule_d receives property fmv, form982 receives excluded cod", () => {
  const result = compute([minimalItem({ box2_cod_amount: 30000, box7_fmv_property: 250000, routing: "excluded" })]);
  const sd = findOutput(result, "schedule_d");
  const form982Out = findOutput(result, "form982");
  assertEquals(sd !== undefined, true);
  assertEquals(form982Out !== undefined, true);
  const sdInput = fieldsOf(result.outputs, schedule_d)!;
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(sdInput.cod_property_fmv, 250000);
  assertEquals(sdInput.cod_debt_cancelled, 30000);
  assertEquals(f982Input.line2_excluded_cod, 30000);
});

Deno.test("edge: two items, one taxable one with box7 — outputs include both schedule1 and schedule_d", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 5000, box7_fmv_property: 120000, routing: "taxable" }),
  ]);
  const s1 = findOutput(result, "schedule1");
  const sd = findOutput(result, "schedule_d");
  assertEquals(s1 !== undefined, true);
  assertEquals(sd !== undefined, true);
});

// ============================================================
// 9. Smoke Test
// ============================================================

Deno.test("smoke: comprehensive — nonbusiness taxable personal debt with all optional fields", () => {
  // Scenario: Personal credit card debt cancelled — fully taxable, no exclusion.
  // Box 2 = $15,000 gross COD. Box 3 = $500 (interest, informational only, inside box 2).
  // Box 5 = personal liability. Box 6 = G (creditor written-off policy).
  // No box7 (no property involved). Routing = taxable.
  const result = compute([
    minimalItem({
      creditor_name: "Capital One Bank",
      box2_cod_amount: 15000,
      routing: "taxable",
    }),
  ]);

  // Must route to schedule1 with full box2 amount
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 15000);

  // Must NOT route to form982 (not excluded)
  const form982 = findOutput(result, "form982");
  assertEquals(form982, undefined);

  // Must NOT route to schedule_d (no property)
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("smoke: comprehensive — excluded QPRI debt with property disposition", () => {
  // Scenario: Foreclosure on principal residence. Box 2 = $50,000 cancelled debt.
  // Box 7 = $220,000 FMV (property disposition triggers schedule_d).
  // Routing = excluded (taxpayer claims QPRI exclusion via Form 982).
  const result = compute([
    minimalItem({
      creditor_name: "Wells Fargo Mortgage",
      box2_cod_amount: 50000,
      box7_fmv_property: 220000,
      routing: "excluded",
    }),
  ]);

  // Must route excluded amount to form982 line2
  const form982Out = findOutput(result, "form982");
  assertEquals(form982Out !== undefined, true);
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 50000);

  // Must route property to schedule_d
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
  const sdInput = fieldsOf(result.outputs, schedule_d)!;
  assertEquals(sdInput.cod_property_fmv, 220000);
  assertEquals(sdInput.cod_debt_cancelled, 50000);

  // Must NOT route to schedule1 (fully excluded)
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("smoke: comprehensive — multiple 1099-Cs in same year, mixed routing", () => {
  // Scenario: Taxpayer received two 1099-Cs.
  // 1st: $8,000 taxable personal loan (schedule1)
  // 2nd: $20,000 excluded mortgage debt (form982)
  const result = compute([
    minimalItem({ creditor_name: "Personal Lender", box2_cod_amount: 8000, routing: "taxable" }),
    minimalItem({ creditor_name: "Mortgage Bank", box2_cod_amount: 20000, routing: "excluded" }),
  ]);

  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 8000);

  const form982Out = findOutput(result, "form982");
  assertEquals(form982Out !== undefined, true);
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 20000);
});

// Total tests: 47
// Coverage section breakdown:
//   1. Input Schema Validation: 6 tests
//   2. Per-Box Routing: 9 tests
//   3. Aggregation: 4 tests
//   4. Thresholds: 4 tests
//   5. Hard Validation Rules: 4 tests
//   6. Warning-Only Rules: 3 tests
//   7. Informational Fields: 2 tests
//   8. Edge Cases: 8 tests
//   9. Smoke Tests: 3 tests
