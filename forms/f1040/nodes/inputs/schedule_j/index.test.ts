import { assertEquals, assertThrows } from "@std/assert";
import { schedule_j } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_j.compute({ taxYear: 2025 }, input as Parameters<typeof schedule_j.compute>[1]);
}

function findF1040Output(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f1040");
}

// =============================================================================
// 1. Input Schema Validation (one invalid case only)
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

Deno.test("schedule_j.inputSchema: negative values are rejected", () => {
  const parsed = schedule_j.inputSchema.safeParse({
    elected_farm_income: -1,
    prior_year_taxable_income_py1: 20000,
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
// 3. schedule_j_tax routes exactly to f1040 line16_income_tax
// The node passes through the pre-computed Schedule J averaged tax unchanged.
// =============================================================================

Deno.test("schedule_j.compute: schedule_j_tax routes to f1040 line16_income_tax exactly", () => {
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

Deno.test("schedule_j.compute: different schedule_j_tax values produce different line16_income_tax", () => {
  // Lower averaged tax (income averaging is beneficial)
  const averaged = compute({
    elected_farm_income: 90000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 20000,
    prior_year_taxable_income_py3: 20000,
    schedule_j_tax: 11000,
  });
  // Higher regular tax (income averaging not elected)
  const regular = compute({
    elected_farm_income: 90000,
    prior_year_taxable_income_py1: 20000,
    prior_year_taxable_income_py2: 20000,
    prior_year_taxable_income_py3: 20000,
    schedule_j_tax: 18000,
  });
  assertEquals(findF1040Output(averaged)?.fields?.line16_income_tax, 11000);
  assertEquals(findF1040Output(regular)?.fields?.line16_income_tax, 18000);
});

Deno.test("schedule_j.compute: new farmer (zero prior years) — schedule_j_tax still routes to line16", () => {
  const result = compute({
    elected_farm_income: 60000,
    prior_year_taxable_income_py1: 0,
    prior_year_taxable_income_py2: 0,
    prior_year_taxable_income_py3: 0,
    schedule_j_tax: 9500,
  });
  assertEquals(findF1040Output(result)?.fields?.line16_income_tax, 9500);
});

// =============================================================================
// 4. Only one output produced
// =============================================================================

Deno.test("schedule_j.compute: exactly one output when elected farm income > 0", () => {
  const result = compute({
    elected_farm_income: 50000,
    prior_year_taxable_income_py1: 10000,
    prior_year_taxable_income_py2: 10000,
    prior_year_taxable_income_py3: 10000,
    schedule_j_tax: 8500,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
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
  assertEquals(findF1040Output(result)?.fields?.line16_income_tax, 125000);
});

// =============================================================================
// 6. Capital Gain Component — does not affect routing or line16 value
// =============================================================================

Deno.test("schedule_j.compute: capital gain component does not change line16 routing", () => {
  const withGain = compute({
    elected_farm_income: 100000,
    elected_farm_income_capital_gain: 20000,
    prior_year_taxable_income_py1: 40000,
    prior_year_taxable_income_py2: 45000,
    prior_year_taxable_income_py3: 50000,
    schedule_j_tax: 22000,
  });
  const withoutGain = compute({
    elected_farm_income: 100000,
    prior_year_taxable_income_py1: 40000,
    prior_year_taxable_income_py2: 45000,
    prior_year_taxable_income_py3: 50000,
    schedule_j_tax: 22000,
  });
  // Both route to f1040 with the same schedule_j_tax
  assertEquals(findF1040Output(withGain)?.fields?.line16_income_tax, 22000);
  assertEquals(findF1040Output(withoutGain)?.fields?.line16_income_tax, 22000);
});

// =============================================================================
// 7. Minimal viable election ($1)
// =============================================================================

Deno.test("schedule_j.compute: minimal EFI of $1 — routes $1 tax to f1040 line16", () => {
  const result = compute({
    elected_farm_income: 1,
    prior_year_taxable_income_py1: 0,
    prior_year_taxable_income_py2: 0,
    prior_year_taxable_income_py3: 0,
    schedule_j_tax: 1,
  });
  assertEquals(findF1040Output(result)?.fields?.line16_income_tax, 1);
});

// =============================================================================
// 8. Invalid input throws
// =============================================================================

Deno.test("schedule_j.compute: invalid input throws on parse", () => {
  assertThrows(() => {
    compute({ elected_farm_income: "not_a_number" });
  });
});
