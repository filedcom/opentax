import { assertEquals, assertThrows } from "@std/assert";
import { f8866, LookbackYear } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    property_description: "Film production costs — Movie XYZ",
    date_placed_in_service: "2022-01-15",
    lookback_year: LookbackYear.Third,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8866.compute({ taxYear: 2025 }, { f8866s: items } as Parameters<typeof f8866.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("f8866: throws when f8866s array is empty", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f8866: throws when property_description is empty", () => {
  assertThrows(() => compute([minimalItem({ property_description: "" })]), Error);
});

Deno.test("f8866: throws when lookback_year is invalid", () => {
  assertThrows(() => compute([minimalItem({ lookback_year: "5th" })]), Error);
});

Deno.test("f8866: throws when total_income_forecast is negative", () => {
  assertThrows(() => compute([minimalItem({ total_income_forecast: -1 })]), Error);
});

// ── No interest_owed_or_due — no output ───────────────────────────────────────

Deno.test("f8866: no output when interest_owed_or_due absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8866: no output when interest_owed_or_due is zero", () => {
  const result = compute([minimalItem({ interest_owed_or_due: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Positive interest → schedule1 income ─────────────────────────────────────

Deno.test("f8866: positive interest routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ interest_owed_or_due: 950 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 950);
});

// ── Negative interest → schedule1 deduction ──────────────────────────────────

Deno.test("f8866: negative interest routes to schedule1 line8z_other", () => {
  const result = compute([minimalItem({ interest_owed_or_due: -600 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other, -600);
});

// ── Aggregation ────────────────────────────────────────────────────────────────

Deno.test("f8866: multiple items aggregate interest_owed_or_due", () => {
  const result = compute([
    minimalItem({ interest_owed_or_due: 400 }),
    minimalItem({ property_description: "TV series", date_placed_in_service: "2015-06-01", lookback_year: LookbackYear.Tenth, interest_owed_or_due: 250 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 650);
});

// ── LookbackYear.Tenth accepted ───────────────────────────────────────────────

Deno.test("f8866: LookbackYear.Tenth accepted", () => {
  const result = compute([minimalItem({ lookback_year: LookbackYear.Tenth })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ── Optional fields accepted ──────────────────────────────────────────────────

Deno.test("f8866: all optional fields accepted", () => {
  const result = compute([minimalItem({
    total_income_forecast: 1000000,
    actual_income: 850000,
    recomputed_depreciation: 85000,
    prior_year_depreciation_claimed: 100000,
    interest_owed_or_due: 720,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f8866: smoke test with all fields populated", () => {
  const result = compute([minimalItem({
    property_description: "Documentary: Climate Shift",
    date_placed_in_service: "2015-03-01",
    lookback_year: LookbackYear.Tenth,
    total_income_forecast: 500000,
    actual_income: 420000,
    recomputed_depreciation: 42000,
    prior_year_depreciation_claimed: 50000,
    interest_owed_or_due: 1100,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 1100);
});
