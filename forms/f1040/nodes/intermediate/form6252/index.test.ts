import { assertEquals, assertAlmostEquals } from "@std/assert";
import { form6252 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form6252.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — no payments returns no installment income", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("smoke — zero payments produces no schedule_d output", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Gross Profit Ratio Calculation ──────────────────────────────────────────

Deno.test("GPR — basic calculation: $40k profit / $100k contract = 40%", () => {
  // $20k payments × 40% GPR = $8k installment income
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 20_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertAlmostEquals(sd?.fields.line_11_form2439 as number, 8_000, 0.01);
});

Deno.test("GPR — 100% ratio: full payment received in first year", () => {
  const result = compute({
    selling_price: 50_000,
    gross_profit: 50_000,
    contract_price: 50_000,
    payments_received: 50_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

Deno.test("GPR — zero gross profit: no taxable income", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 0,
    contract_price: 100_000,
    payments_received: 30_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("GPR — partial payment in year", () => {
  // Gross profit $60k / contract $100k = 60% GPR
  // Year 1 payment $10k × 60% = $6k installment income
  const result = compute({
    selling_price: 100_000,
    gross_profit: 60_000,
    contract_price: 100_000,
    payments_received: 10_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 6_000);
});

// ─── Depreciation Recapture ───────────────────────────────────────────────────

Deno.test("depreciation recapture — routes to form4797 ordinary_gain in full", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 0,
    depreciation_recapture: 15_000,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.ordinary_gain, 15_000);
});

Deno.test("depreciation recapture + installment income — both outputs", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 20_000,
    depreciation_recapture: 10_000,
  });
  const f4797 = findOutput(result, "form4797");
  const sd = findOutput(result, "schedule_d");
  assertEquals(f4797?.fields.ordinary_gain, 10_000);
  assertAlmostEquals(sd?.fields.line_11_form2439 as number, 8_000, 0.01);
});

// ─── Capital Asset vs §1231 Routing ──────────────────────────────────────────

Deno.test("capital asset (default) — long-term routes to schedule_d line_11", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
  assertEquals(sd?.nodeType, "schedule_d");
});

Deno.test("capital asset short-term — routes to schedule_d short-term proceeds", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
    is_long_term: false,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_1a_proceeds, 10_000);
  assertEquals(sd?.fields.line_1a_cost, 0);
});

Deno.test("section 1231 property — routes to form4797 section_1231_gain", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
    is_capital_asset: false,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.section_1231_gain, 10_000);
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

Deno.test("negative gross profit — loss on sale produces negative schedule_d amount", () => {
  // GPR = -10,000 / 100,000 = -10%; payments $20k × -10% = -$2k (installment loss)
  const result = compute({
    selling_price: 100_000,
    gross_profit: -10_000,
    contract_price: 100_000,
    payments_received: 20_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertAlmostEquals(sd?.fields.line_11_form2439 as number, -2_000, 0.01);
});
