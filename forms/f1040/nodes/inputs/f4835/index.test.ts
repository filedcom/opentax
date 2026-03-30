import { assertEquals, assertThrows } from "@std/assert";
import { f4835 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    activity_name: "Test Farm",
    gross_farm_rental_income: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f4835.compute({ f4835s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(() => f4835.compute({ f4835s: [] }), Error);
});

Deno.test("missing activity_name throws", () => {
  assertThrows(
    () => f4835.compute({ f4835s: [{ gross_farm_rental_income: 100 } as unknown as ReturnType<typeof minimalItem>] }),
    Error,
  );
});

Deno.test("negative gross_farm_rental_income throws", () => {
  assertThrows(
    () => compute([minimalItem({ gross_farm_rental_income: -1 })]),
    Error,
  );
});

Deno.test("negative expenses throw", () => {
  assertThrows(
    () => compute([minimalItem({ expense_repairs_maintenance: -50 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("positive net routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ gross_farm_rental_income: 5000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("negative net routes to schedule1 line5_schedule_e as loss", () => {
  const result = compute([
    minimalItem({ gross_farm_rental_income: 1000, expense_repairs_maintenance: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -2000);
});

Deno.test("zero income and zero expenses does not route", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("federal_withheld routes to f1040 line25b", () => {
  const result = compute([minimalItem({ federal_withheld: 200 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line25b_withheld_1099, 200);
});

Deno.test("zero federal_withheld does not route to f1040", () => {
  const result = compute([minimalItem({ gross_farm_rental_income: 1000 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple farms ──────────────────────────────────────

Deno.test("net income sums across multiple farms to schedule1", () => {
  const result = compute([
    minimalItem({ gross_farm_rental_income: 3000 }),
    minimalItem({ activity_name: "Second Farm", gross_farm_rental_income: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("federal_withheld sums across multiple farms to f1040", () => {
  const result = compute([
    minimalItem({ federal_withheld: 100 }),
    minimalItem({ activity_name: "Farm 2", federal_withheld: 150 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line25b_withheld_1099, 250);
});

// ── 4. Calculation logic ──────────────────────────────────────────────────────

Deno.test("net computed as gross income minus total expenses", () => {
  const result = compute([
    minimalItem({
      gross_farm_rental_income: 10000,
      expense_chemicals: 500,
      expense_feed: 1000,
      expense_repairs_maintenance: 750,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  // net = 10000 - 500 - 1000 - 750 = 7750
  assertEquals(out?.fields.line5_schedule_e, 7750);
});

Deno.test("pre-computed net_farm_rental_income overrides calculation", () => {
  const result = compute([
    minimalItem({
      gross_farm_rental_income: 10000,
      expense_repairs_maintenance: 500,
      net_farm_rental_income: 8000, // override
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 8000);
});

Deno.test("ccc_loans_forfeited added to income", () => {
  const result = compute([
    minimalItem({ gross_farm_rental_income: 5000, ccc_loans_forfeited: 1000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 6000);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("activity_name does not affect output count", () => {
  const r1 = compute([minimalItem({ gross_farm_rental_income: 1000 })]);
  const r2 = compute([minimalItem({ activity_name: "Different Name", gross_farm_rental_income: 1000 })]);
  assertEquals(r1.outputs.length, r2.outputs.length);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("loss (negative net) aggregates correctly across two farms", () => {
  const result = compute([
    minimalItem({ gross_farm_rental_income: 1000 }),
    minimalItem({ activity_name: "Farm 2", gross_farm_rental_income: 500, expense_feed: 2000 }),
  ]);
  // Farm 1: +1000, Farm 2: +500 - 2000 = -1500 → total = -500
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -500);
});

Deno.test("at-risk flag routes to form6198", () => {
  const result = compute([
    minimalItem({
      gross_farm_rental_income: 5000,
      some_investment_not_at_risk: true,
    }),
  ]);
  const out = findOutput(result, "form6198");
  assertEquals(out !== undefined, true);
});

Deno.test("no at-risk flag does not route to form6198", () => {
  const result = compute([minimalItem({ gross_farm_rental_income: 5000 })]);
  const out = findOutput(result, "form6198");
  assertEquals(out, undefined);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — full 4835 with all major fields", () => {
  const result = compute([
    minimalItem({
      gross_farm_rental_income: 20000,
      ccc_loans_forfeited: 1000,
      expense_chemicals: 500,
      expense_depreciation: 2000,
      expense_feed: 1500,
      expense_insurance: 800,
      expense_repairs_maintenance: 600,
      expense_taxes: 400,
      federal_withheld: 300,
    }),
  ]);
  // net = (20000 + 1000) - (500 + 2000 + 1500 + 800 + 600 + 400) = 21000 - 5800 = 15200
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 15200);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line25b_withheld_1099, 300);
});
