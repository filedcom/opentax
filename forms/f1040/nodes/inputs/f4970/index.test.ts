import { assertEquals, assertThrows } from "@std/assert";
import { f4970 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    trust_name: "Smith Family Trust",
    trust_ein: "12-3456789",
    distribution_amount: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f4970.compute(
    { taxYear: 2025, formType: "f1040" },
    { f4970s: items } as Parameters<typeof f4970.compute>[1],
  );
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
  assertThrows(
    () => compute([minimalItem({ distribution_amount: -1 })]),
    Error,
  );
});

// ── No active distribution ───────────────────────────────────────────────────

Deno.test("f4970: empty source does not add tax", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f4970: zero asserted tax does not add tax", () => {
  const result = compute([minimalItem({ tax_deemed_distributed: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Active source must not silently route to the wrong return line ──────────

Deno.test("f4970: positive asserted tax fails before Schedule 2 line 17l support", () => {
  assertThrows(() => compute([minimalItem({ tax_deemed_distributed: 2500 })]));
});

Deno.test("f4970: positive distribution cannot disappear when asserted tax is absent", () => {
  assertThrows(() => compute([minimalItem({ distribution_amount: 10000 })]));
});

Deno.test("f4970: multiple trust distributions fail before native attachment support", () => {
  assertThrows(() =>
    compute([
      minimalItem({
        trust_name: "Trust A",
        trust_ein: "11-1111111",
        tax_deemed_distributed: 1500,
      }),
      minimalItem({
        trust_name: "Trust B",
        trust_ein: "22-2222222",
        tax_deemed_distributed: 1000,
      }),
    ])
  );
});

// ── Optional fields ────────────────────────────────────────────────────────────

Deno.test("f4970: positive throwback year fails without the full calculation", () => {
  assertThrows(() =>
    compute([minimalItem({
      throwback_years: [
        { tax_year: 2022, accumulated_income: 5000, taxes_paid_by_trust: 1050 },
        { tax_year: 2023, accumulated_income: 3000 },
      ],
    })])
  );
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f4970: populated trust distribution does not export an unsupported form", () => {
  assertThrows(() =>
    compute([minimalItem({
      trust_name: "Jones Irrevocable Trust",
      trust_ein: "98-7654321",
      distribution_amount: 50000,
      throwback_years: [
        {
          tax_year: 2020,
          accumulated_income: 20000,
          taxes_paid_by_trust: 4200,
        },
        {
          tax_year: 2021,
          accumulated_income: 30000,
          taxes_paid_by_trust: 6300,
        },
      ],
      tax_deemed_distributed: 3800,
    })])
  );
});
