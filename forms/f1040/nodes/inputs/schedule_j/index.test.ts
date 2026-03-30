import { assertEquals, assertThrows } from "@std/assert";
import { schedule_j } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_j.compute(input as Parameters<typeof schedule_j.compute>[0]);
}

function findF1040Output(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f1040");
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("schedule_j.inputSchema: valid minimal input passes", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 50000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 8000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("schedule_j.inputSchema: negative elected_farm_income fails", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: -1,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 8000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_j.inputSchema: negative schedule_j_tax fails", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 50000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_j.inputSchema: negative prior year income py1 fails", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 50000,
    prior_year_taxable_income_py1: -500,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 8000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_j.inputSchema: optional capital gain field accepted", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 50000,
    elected_farm_income_capital_gain: 10000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 7500,
  });
  assertEquals(parsed.success, true);
});

Deno.test("schedule_j.inputSchema: missing required elected_farm_income fails", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 8000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_j.inputSchema: missing required schedule_j_tax fails", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 50000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schedule_j.inputSchema: zero elected_farm_income is valid schema-wise", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: 0,
    prior_year_taxable_income_py1: 0,
    prior_year_taxable_income_py2: 0,
    prior_year_taxable_income_py3: 0,
    schedule_j_tax: 0,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. No Output When No Elected Farm Income
// =============================================================================

Deno.test("schedule_j.compute: zero elected_farm_income — no outputs", () => {
  const result = compute({
    elected_farm_income: 0,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 25000,
    prior_year_taxable_income_py3: 30000,
    schedule_j_tax: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Normal Farming Scenario — Routes schedule_j_tax to f1040 line 16
// =============================================================================

Deno.test("schedule_j.compute: with elected farm income and prior years — produces f1040 output", () => {
  const result = compute({
    elected_farm_income: 80000,
    prior_year_taxable_income_py1: 30000,
    prior_year_taxable_income_py2: 35000,
    prior_year_taxable_income_py3: 40000,
    schedule_j_tax: 14000,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out !== undefined, true);
});

Deno.test("schedule_j.compute: schedule_j_tax routes to f1040 line16_income_tax", () => {
  const result = compute({
    elected_farm_income: 80000,
    prior_year_taxable_income_py1: 30000,
    prior_year_taxable_income_py2: 35000,
    prior_year_taxable_income_py3: 40000,
    schedule_j_tax: 14000,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out?.fields?.line16_income_tax, 14000);
});

// =============================================================================
// 4. Zero Prior Year Incomes (First Years of Farming)
// =============================================================================

Deno.test("schedule_j.compute: zero prior year incomes (new farmer) — produces output with tax", () => {
  const result = compute({
    elected_farm_income: 60000,
    prior_year_taxable_income_py1: 0,
    prior_year_taxable_income_py2: 0,
    prior_year_taxable_income_py3: 0,
    schedule_j_tax: 9500,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out !== undefined, true);
  assertEquals(f1040Out?.fields?.line16_income_tax, 9500);
});

// =============================================================================
// 5. High Income Scenario
// =============================================================================

Deno.test("schedule_j.compute: large elected farm income — routes correct tax to f1040", () => {
  const result = compute({
    elected_farm_income: 500000,
    prior_year_taxable_income_py1: 50000,
    prior_year_taxable_income_py2: 60000,
    prior_year_taxable_income_py3: 70000,
    schedule_j_tax: 125000,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out?.fields?.line16_income_tax, 125000);
});

// =============================================================================
// 6. With Capital Gain Component
// =============================================================================

Deno.test("schedule_j.compute: with capital gain component — produces f1040 output with correct tax", () => {
  const result = compute({
    elected_farm_income: 100000,
    elected_farm_income_capital_gain: 20000,
    prior_year_taxable_income_py1: 40000,
    prior_year_taxable_income_py2: 45000,
    prior_year_taxable_income_py3: 50000,
    schedule_j_tax: 22000,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out !== undefined, true);
  assertEquals(f1040Out?.fields?.line16_income_tax, 22000);
});

// =============================================================================
// 7. Exact EFI Pass-through — Minimal viable election
// =============================================================================

Deno.test("schedule_j.compute: minimal EFI of $1 — routes to f1040", () => {
  const result = compute({
    elected_farm_income: 1,
    prior_year_taxable_income_py1: 0,
    prior_year_taxable_income_py2: 0,
    prior_year_taxable_income_py3: 0,
    schedule_j_tax: 1,
  });
  const f1040Out = findF1040Output(result);
  assertEquals(f1040Out !== undefined, true);
  assertEquals(f1040Out?.fields?.line16_income_tax, 1);
});

// =============================================================================
// 8. assertThrows: invalid input throws
// =============================================================================

Deno.test("schedule_j.compute: invalid input throws on parse", () => {
  assertThrows(() => {
    compute({ elected_farm_income: "not_a_number" });
  });
});
