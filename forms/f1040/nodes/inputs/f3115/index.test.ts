import { assertEquals, assertThrows } from "@std/assert";
import { f3115, FilingType } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    designated_change_number: "DCN-222",
    filing_type: FilingType.Automatic,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f3115.compute({ taxYear: 2025, formType: "f1040" }, { f3115s: items } as Parameters<typeof f3115.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("f3115: throws when f3115s array is empty", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f3115: throws when designated_change_number is empty string", () => {
  assertThrows(
    () => compute([minimalItem({ designated_change_number: "" })]),
    Error,
  );
});

Deno.test("f3115: throws when filing_type is invalid", () => {
  assertThrows(
    () => compute([minimalItem({ filing_type: "bad_type" })]),
    Error,
  );
});

Deno.test("f3115: throws when spread_period is zero", () => {
  assertThrows(
    () => compute([minimalItem({ spread_period: 0 })]),
    Error,
  );
});

Deno.test("f3115: throws when spread_period is negative", () => {
  assertThrows(
    () => compute([minimalItem({ spread_period: -1 })]),
    Error,
  );
});

// ── No §481(a) adjustment — no output ────────────────────────────────────────

Deno.test("f3115: no output when section_481_adjustment absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3115: no output when section_481_adjustment is zero", () => {
  const result = compute([minimalItem({ section_481_adjustment: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Positive §481(a) → schedule1 income ──────────────────────────────────────

Deno.test("f3115: positive adjustment routes to schedule1 as line8z_other_income", () => {
  const result = compute([minimalItem({ section_481_adjustment: 12000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 12000);
});

Deno.test("f3115: positive adjustment with spread_period=4 routes one-quarter per year", () => {
  const result = compute([minimalItem({ section_481_adjustment: 12000, spread_period: 4 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 3000);
});

Deno.test("f3115: positive adjustment with spread_period=1 routes full amount", () => {
  const result = compute([minimalItem({ section_481_adjustment: 8000, spread_period: 1 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 8000);
});

// ── Negative §481(a) → schedule1 deduction ───────────────────────────────────

Deno.test("f3115: negative adjustment routes to schedule1 as negative line8z_other", () => {
  const result = compute([minimalItem({ section_481_adjustment: -6000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other, -6000);
});

Deno.test("f3115: negative adjustment with spread_period=1 routes full amount", () => {
  const result = compute([minimalItem({ section_481_adjustment: -4000, spread_period: 1 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other, -4000);
});

// ── Aggregation across multiple items ─────────────────────────────────────────

Deno.test("f3115: multiple items with positive adjustments aggregate to single schedule1 output", () => {
  const result = compute([
    minimalItem({ section_481_adjustment: 5000 }),
    minimalItem({ designated_change_number: "DCN-333", section_481_adjustment: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 8000);
});

Deno.test("f3115: negative adjustment with spread_period=4 routes one-quarter per year", () => {
  const result = compute([minimalItem({ section_481_adjustment: -12000, spread_period: 4 })]);
  const out = findOutput(result, "schedule1");
  assertEquals((out!.fields as Record<string, unknown>).line8z_other, -3000);
});

Deno.test("f3115: mixed positive and negative items net to zero — no output", () => {
  const result = compute([
    minimalItem({ section_481_adjustment: 6000 }),
    minimalItem({ designated_change_number: "DCN-444", section_481_adjustment: -6000 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3115: mixed items net to positive — routes as income", () => {
  const result = compute([
    minimalItem({ section_481_adjustment: 10000 }),
    minimalItem({ designated_change_number: "DCN-555", section_481_adjustment: -4000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 6000);
});

Deno.test("f3115: FilingType.AdvanceConsent is accepted and produces no output without adjustment", () => {
  const result = compute([minimalItem({ filing_type: FilingType.AdvanceConsent })]);
  assertEquals(result.outputs.length, 0);
});

// ── Optional fields ────────────────────────────────────────────────────────────

Deno.test("f3115: optional accounting method fields do not affect computed adjustment", () => {
  const result = compute([
    minimalItem({
      accounting_method_before: "Cash basis",
      accounting_method_proposed: "Accrual basis",
      section_481_adjustment: 10000,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 10000);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f3115: smoke test with all fields populated", () => {
  const result = compute([
    minimalItem({
      designated_change_number: "DCN-184",
      filing_type: FilingType.Automatic,
      section_481_adjustment: 20000,
      spread_period: 4,
      accounting_method_before: "Cash basis",
      accounting_method_proposed: "Accrual basis",
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 5000);
});
