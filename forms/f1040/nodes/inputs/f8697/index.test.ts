import { assertEquals, assertThrows } from "@std/assert";
import { f8697, ContractType } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    contract_type: ContractType.Regular,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8697.compute({ taxYear: 2025 }, { f8697s: items } as Parameters<typeof f8697.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("f8697: throws when f8697s array is empty", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f8697: throws when contract_type is invalid", () => {
  assertThrows(() => compute([minimalItem({ contract_type: "bad" })]), Error);
});

// ── No net_interest — no output ───────────────────────────────────────────────

Deno.test("f8697: no output when net_interest absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8697: no output when net_interest is zero", () => {
  const result = compute([minimalItem({ net_interest: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// ── Positive net_interest → schedule1 income ──────────────────────────────────

Deno.test("f8697: positive net_interest routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ net_interest: 1200 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 1200);
});

// ── Negative net_interest → schedule1 deduction ───────────────────────────────

Deno.test("f8697: negative net_interest routes to schedule1 line8z_other", () => {
  const result = compute([minimalItem({ net_interest: -800 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other, -800);
});

// ── Aggregation ────────────────────────────────────────────────────────────────

Deno.test("f8697: multiple items aggregate net_interest", () => {
  const result = compute([
    minimalItem({ net_interest: 500 }),
    minimalItem({ contract_type: ContractType.Simplified, net_interest: 300 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 800);
});

// ── Optional fields accepted ──────────────────────────────────────────────────

Deno.test("f8697: all optional fields accepted", () => {
  const result = compute([minimalItem({
    prior_tax_years_affected: [
      { tax_year: 2022, hypothetical_tax: 5000, actual_tax_paid: 4500 },
    ],
    overpayment_of_tax_prior_year: 500,
    underpayment_of_tax_prior_year: 0,
    interest_rate: 0.07,
    net_interest: 350,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ── ContractType.Simplified accepted ─────────────────────────────────────────

Deno.test("f8697: ContractType.Simplified accepted", () => {
  const result = compute([minimalItem({ contract_type: ContractType.Simplified })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f8697: smoke test with all fields populated", () => {
  const result = compute([minimalItem({
    contract_type: ContractType.Regular,
    prior_tax_years_affected: [
      { tax_year: 2021, hypothetical_tax: 10000, actual_tax_paid: 9000 },
      { tax_year: 2022, hypothetical_tax: 12000, actual_tax_paid: 11500 },
    ],
    overpayment_of_tax_prior_year: 0,
    underpayment_of_tax_prior_year: 1500,
    interest_rate: 0.08,
    net_interest: 240,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, unknown>).line8z_other_income, 240);
});
