import { assertEquals, assertThrows } from "@std/assert";
import { ExpenditureType, f59e } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    expenditure_type: ExpenditureType.ResearchExperimental,
    amortization_period_start: "2020-01-01",
    original_amount: 50000,
    remaining_unamortized: 10000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f59e.compute({ taxYear: 2025, formType: "f1040" }, { f59es: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("f59e.inputSchema: valid minimal item passes", () => {
  assertEquals(f59e.inputSchema.safeParse({ f59es: [minimalItem()] }).success, true);
});

Deno.test("f59e.inputSchema: empty array fails", () => {
  assertEquals(f59e.inputSchema.safeParse({ f59es: [] }).success, false);
});

Deno.test("f59e.inputSchema: negative remaining_unamortized fails", () => {
  assertEquals(f59e.inputSchema.safeParse({ f59es: [minimalItem({ remaining_unamortized: -1 })] }).success, false);
});

Deno.test("f59e.inputSchema: negative original_amount fails", () => {
  assertEquals(f59e.inputSchema.safeParse({ f59es: [minimalItem({ original_amount: -1 })] }).success, false);
});

Deno.test("f59e.inputSchema: invalid expenditure_type fails", () => {
  assertEquals(f59e.inputSchema.safeParse({ f59es: [minimalItem({ expenditure_type: "unknown" })] }).success, false);
});

Deno.test("f59e.inputSchema: all expenditure types pass", () => {
  for (const t of Object.values(ExpenditureType)) {
    assertEquals(f59e.inputSchema.safeParse({ f59es: [minimalItem({ expenditure_type: t })] }).success, true);
  }
});

Deno.test("f59e.compute: routes remaining_unamortized to form6251.other_adjustments", () => {
  const result = compute([minimalItem({ remaining_unamortized: 10000 })]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 10000);
});

Deno.test("f59e.compute: zero remaining_unamortized produces no output", () => {
  const result = compute([minimalItem({ remaining_unamortized: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f59e.compute: multiple items — sums remaining_unamortized", () => {
  const result = compute([
    minimalItem({ remaining_unamortized: 5000 }),
    minimalItem({ expenditure_type: ExpenditureType.Mining, remaining_unamortized: 3000 }),
  ]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 8000);
});

Deno.test("f59e.compute: mining expenditure routes correctly", () => {
  const result = compute([minimalItem({ expenditure_type: ExpenditureType.Mining, remaining_unamortized: 7500 })]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 7500);
});

Deno.test("f59e.compute: intangible drilling routes correctly", () => {
  const result = compute([minimalItem({ expenditure_type: ExpenditureType.IntangibleDrilling, remaining_unamortized: 20000 })]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 20000);
});

Deno.test("f59e.compute: circulation costs use current-year deduction difference, not unamortized balance", () => {
  const result = compute([
    minimalItem({
      expenditure_type: ExpenditureType.Circulation,
      remaining_unamortized: 25_000,
      regular_tax_deduction: 9_000,
      amt_deduction: 3_000,
      regular_three_year_writeoff_elected: false,
      circulation_reviewed_workpaper_reference: "2025 circulation worksheet A",
      circulation_no_unamortized_property_loss: true,
    }),
  ]);
  assertEquals(findOutput(result, "form6251")?.fields, {
    line2o_circulation_costs: 6_000,
  });
});

Deno.test("f59e.compute: circulation amortization can create a negative line 2o", () => {
  const result = compute([
    minimalItem({
      expenditure_type: ExpenditureType.Circulation,
      remaining_unamortized: 5_000,
      regular_tax_deduction: 0,
      amt_deduction: 2_000,
      regular_three_year_writeoff_elected: false,
      circulation_reviewed_workpaper_reference: "2025 circulation worksheet B",
      circulation_no_unamortized_property_loss: true,
    }),
  ]);
  assertEquals(findOutput(result, "form6251")?.fields.line2o_circulation_costs, -2_000);
});

Deno.test("f59e.compute: circulation route requires deduction and election facts", () => {
  assertThrows(
    () => compute([minimalItem({ expenditure_type: ExpenditureType.Circulation })]),
    Error,
    "need reviewed current-year deductions",
  );
  assertThrows(
    () => compute([minimalItem({
      expenditure_type: ExpenditureType.Circulation,
      regular_tax_deduction: 5_000,
      amt_deduction: 1_000,
      regular_three_year_writeoff_elected: true,
      circulation_reviewed_workpaper_reference: "2025 circulation worksheet C",
      circulation_no_unamortized_property_loss: true,
    })]),
    Error,
    "cannot differ",
  );
});

Deno.test("f59e.compute: circulation route rejects an unreviewed or loss-bearing pool", () => {
  const reviewed = {
    expenditure_type: ExpenditureType.Circulation,
    regular_tax_deduction: 9_000,
    amt_deduction: 3_000,
    regular_three_year_writeoff_elected: false,
    circulation_reviewed_workpaper_reference: "2025 circulation worksheet F",
    circulation_no_unamortized_property_loss: true,
  };
  assertThrows(
    () => compute([minimalItem({ ...reviewed, circulation_reviewed_workpaper_reference: undefined })]),
    Error,
    "need reviewed current-year deductions",
  );
  assertThrows(
    () => compute([minimalItem({ ...reviewed, circulation_no_unamortized_property_loss: false })]),
  );
  assertThrows(
    () => compute([minimalItem({ ...reviewed, amt_deduction: 50_001 })]),
    Error,
    "cannot exceed the original expenditure",
  );
});

Deno.test("f59e.compute: elected three-year write-off has no circulation adjustment", () => {
  const result = compute([minimalItem({
    expenditure_type: ExpenditureType.Circulation,
    regular_tax_deduction: 3_000,
    amt_deduction: 3_000,
    regular_three_year_writeoff_elected: true,
    circulation_reviewed_workpaper_reference: "2025 circulation worksheet D",
    circulation_no_unamortized_property_loss: true,
  })]);
  assertEquals(result.outputs, []);
});

Deno.test("f59e.compute: unsupported non-circulation items remain separate from line 2o", () => {
  const result = compute([
    minimalItem({ expenditure_type: ExpenditureType.ResearchExperimental, remaining_unamortized: 10000 }),
    minimalItem({
      expenditure_type: ExpenditureType.Circulation,
      remaining_unamortized: 2500,
      regular_tax_deduction: 4_000,
      amt_deduction: 1_000,
      regular_three_year_writeoff_elected: false,
      circulation_reviewed_workpaper_reference: "2025 circulation worksheet E",
      circulation_no_unamortized_property_loss: true,
    }),
    minimalItem({ expenditure_type: ExpenditureType.Development, remaining_unamortized: 0 }),
  ]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 10000);
  assertEquals(out!.fields.line2o_circulation_costs, 3000);
});
