import { assertEquals, assertThrows } from "@std/assert";
import { f8896 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8896.compute({ taxYear: 2025, formType: "f1040" }, { f8896s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8896.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8896.inputSchema: negative gallons_ulsd_produced fails", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [{ gallons_ulsd_produced: -1000 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8896.inputSchema: negative qualified_capital_costs fails", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [{ qualified_capital_costs: -500 }] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Gallon Credit Calculation (IRC §45H(a): 5 cents/gallon)
// =============================================================================

Deno.test("f8896.compute: credit = gallons × 0.05", () => {
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    refinery_capacity_barrels_per_day: 100_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 50_000);
});

Deno.test("f8896.compute: zero gallons — no output", () => {
  const result = compute([minimalItem({
    gallons_ulsd_produced: 0,
    refinery_capacity_barrels_per_day: 100_000,
  })]);
  assertEquals(result.outputs, []);
});

Deno.test("f8896.compute: no gallons field — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs, []);
});

Deno.test("f8896.compute: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute([minimalItem({
    gallons_ulsd_produced: 200_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 10_000);
});

// =============================================================================
// 3. Capital Costs Limitation (IRC §45H(b)(1): 25% cap minus prior credits)
// =============================================================================

Deno.test("f8896.compute: base credit within capital costs cap — cap not applied", () => {
  // base = 200,000 × 0.05 = 10,000; cap = 100,000 × 0.25 = 25,000 → no cap
  const result = compute([minimalItem({
    gallons_ulsd_produced: 200_000,
    qualified_capital_costs: 100_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 10_000);
});

Deno.test("f8896.compute: base credit exceeds capital costs cap — capped", () => {
  // base = 2,000,000 × 0.05 = 100,000; cap = 200,000 × 0.25 = 50,000 → capped
  const result = compute([minimalItem({
    gallons_ulsd_produced: 2_000_000,
    qualified_capital_costs: 200_000,
    refinery_capacity_barrels_per_day: 50_000,
    prior_year_credits_claimed: 0,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 50_000);
});

Deno.test("f8896.compute: prior credits reduce capital costs cap", () => {
  // cap = 200,000 × 0.25 - 30,000 = 20,000; base = 1,000,000 × 0.05 = 50,000 → capped at 20,000
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    qualified_capital_costs: 200_000,
    prior_year_credits_claimed: 30_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 20_000);
});

Deno.test("f8896.compute: prior credits fully consume cap — no output", () => {
  // cap = 200,000 × 0.25 - 50,000 = 0 → no credit
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    qualified_capital_costs: 200_000,
    prior_year_credits_claimed: 50_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  assertEquals(result.outputs, []);
});

Deno.test("f8896.compute: no qualified_capital_costs — no cap applied", () => {
  // Without capital costs, cap is null and base credit used directly
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 50_000);
});

// =============================================================================
// 4. Refinery Capacity Threshold (IRC §45H(c)(1)(A): 205,000 bbl/day max)
// =============================================================================

Deno.test("f8896.compute: capacity exactly at 205,000 bbl/day — allowed", () => {
  const result = compute([minimalItem({
    gallons_ulsd_produced: 100_000,
    refinery_capacity_barrels_per_day: 205_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_000);
});

Deno.test("f8896.compute: capacity above 205,000 bbl/day — throws", () => {
  assertThrows(
    () => compute([minimalItem({
      gallons_ulsd_produced: 100_000,
      refinery_capacity_barrels_per_day: 205_001,
    })]),
    Error,
  );
});

// =============================================================================
// 5. Aggregation — Multiple Refineries
// =============================================================================

Deno.test("f8896.compute: multiple refineries — credits summed", () => {
  // Item 1: 200,000 × 0.05 = 10,000; Item 2: 300,000 × 0.05 = 15,000 → total 25,000
  const result = compute([
    minimalItem({ gallons_ulsd_produced: 200_000, refinery_capacity_barrels_per_day: 50_000 }),
    minimalItem({ gallons_ulsd_produced: 300_000, refinery_capacity_barrels_per_day: 80_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 25_000);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8896.compute: smoke test — capital costs cap applied", () => {
  // base = 5,000,000 × 0.05 = 250,000; cap = 1,000,000 × 0.25 - 50,000 = 200,000 → credit = 200,000
  const result = compute([
    minimalItem({
      gallons_ulsd_produced: 5_000_000,
      qualified_capital_costs: 1_000_000,
      prior_year_credits_claimed: 50_000,
      refinery_capacity_barrels_per_day: 150_000,
    }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 200_000);
});
