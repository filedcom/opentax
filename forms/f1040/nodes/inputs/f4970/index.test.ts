import { assertEquals, assertThrows } from "@std/assert";
import { f4970 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    trust_name: "Smith Family Trust",
    trust_ein: "12-3456789",
    distribution_amount: 10000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f4970.compute({ taxYear: 2025 }, { f4970s: items } as Parameters<typeof f4970.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("f4970: throws when f4970s array is empty", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f4970: throws when trust_name is empty", () => {
  assertThrows(() => compute([minimalItem({ trust_name: "" })]), Error);
});

Deno.test("f4970: throws when trust_ein is empty", () => {
  assertThrows(() => compute([minimalItem({ trust_ein: "" })]), Error);
});

Deno.test("f4970: throws when distribution_amount is negative", () => {
  assertThrows(() => compute([minimalItem({ distribution_amount: -1 })]), Error);
});

// ── No tax_deemed_distributed — no f1040 output ───────────────────────────────

Deno.test("f4970: no f1040 output when tax_deemed_distributed absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f4970: no f1040 output when tax_deemed_distributed is zero", () => {
  const result = compute([minimalItem({ tax_deemed_distributed: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── tax_deemed_distributed > 0 routes to f1040 ───────────────────────────────

Deno.test("f4970: tax_deemed_distributed routes to f1040 line17_additional_taxes", () => {
  const result = compute([minimalItem({ tax_deemed_distributed: 2500 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line17_additional_taxes, 2500);
});

// ── Aggregation ────────────────────────────────────────────────────────────────

Deno.test("f4970: multiple items aggregate tax_deemed_distributed", () => {
  const result = compute([
    minimalItem({ trust_name: "Trust A", trust_ein: "11-1111111", tax_deemed_distributed: 1500 }),
    minimalItem({ trust_name: "Trust B", trust_ein: "22-2222222", tax_deemed_distributed: 1000 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line17_additional_taxes, 2500);
});

// ── Optional fields ────────────────────────────────────────────────────────────

Deno.test("f4970: throwback_years array accepted", () => {
  const result = compute([minimalItem({
    throwback_years: [
      { tax_year: 2022, accumulated_income: 5000, taxes_paid_by_trust: 1050 },
      { tax_year: 2023, accumulated_income: 3000 },
    ],
    tax_deemed_distributed: 800,
  })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f4970: smoke test with all fields populated", () => {
  const result = compute([minimalItem({
    trust_name: "Jones Irrevocable Trust",
    trust_ein: "98-7654321",
    distribution_amount: 50000,
    throwback_years: [
      { tax_year: 2020, accumulated_income: 20000, taxes_paid_by_trust: 4200 },
      { tax_year: 2021, accumulated_income: 30000, taxes_paid_by_trust: 6300 },
    ],
    tax_deemed_distributed: 3800,
  })]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line17_additional_taxes, 3800);
});
