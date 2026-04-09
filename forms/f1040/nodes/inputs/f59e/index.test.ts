import { assertEquals } from "@std/assert";
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

Deno.test("f59e.compute: smoke test — multiple types summed", () => {
  const result = compute([
    minimalItem({ expenditure_type: ExpenditureType.ResearchExperimental, remaining_unamortized: 10000 }),
    minimalItem({ expenditure_type: ExpenditureType.Circulation, remaining_unamortized: 2500 }),
    minimalItem({ expenditure_type: ExpenditureType.Development, remaining_unamortized: 0 }),
  ]);
  const out = findOutput(result, "form6251");
  assertEquals(out!.fields.other_adjustments, 12500);
});
