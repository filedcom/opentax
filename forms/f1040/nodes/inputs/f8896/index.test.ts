import { assertEquals, assertThrows } from "@std/assert";
import { f8896 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8896.compute({ taxYear: 2025 }, { f8896s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8896.inputSchema: valid minimal item passes", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [{}] });
  assertEquals(parsed.success, true);
});

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

Deno.test("f8896.inputSchema: negative refinery_capacity_barrels_per_day fails", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [{ refinery_capacity_barrels_per_day: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8896.inputSchema: negative prior_year_credits_claimed fails", () => {
  const parsed = f8896.inputSchema.safeParse({ f8896s: [{ prior_year_credits_claimed: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8896.inputSchema: valid full item passes", () => {
  const parsed = f8896.inputSchema.safeParse({
    f8896s: [{
      gallons_ulsd_produced: 1_000_000,
      qualified_capital_costs: 500_000,
      refinery_capacity_barrels_per_day: 100_000,
      prior_year_credits_claimed: 10_000,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing & Calculation
// =============================================================================

Deno.test("f8896.compute: basic credit = gallons × 0.05", () => {
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
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8896.compute: no gallons field — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8896.compute: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute([minimalItem({
    gallons_ulsd_produced: 200_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
});

// =============================================================================
// 3. Capital Costs Limitation
// =============================================================================

Deno.test("f8896.compute: credit limited to 25% of qualified_capital_costs", () => {
  // gallons × 0.05 = 200,000 × 0.05 = 10,000
  // capital cap = 100,000 × 0.25 = 25,000 → no cap applied
  const result = compute([minimalItem({
    gallons_ulsd_produced: 200_000,
    qualified_capital_costs: 100_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 10_000);
});

Deno.test("f8896.compute: capital costs cap reduces credit when base exceeds cap", () => {
  // gallons × 0.05 = 2,000,000 × 0.05 = 100,000
  // capital cap = 200,000 × 0.25 - 0 = 50,000 → capped at 50,000
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
  // capital cap = 200,000 × 0.25 - 30,000 = 20,000
  // base credit = 1,000,000 × 0.05 = 50,000 → capped at 20,000
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
  // capital cap = 200,000 × 0.25 - 50,000 = 0 → no credit
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    qualified_capital_costs: 200_000,
    prior_year_credits_claimed: 50_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8896.compute: no capital costs provided — no capital cap applied", () => {
  // Without qualified_capital_costs, no cap is enforced; use base credit directly
  const result = compute([minimalItem({
    gallons_ulsd_produced: 1_000_000,
    refinery_capacity_barrels_per_day: 50_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 50_000);
});

// =============================================================================
// 4. Refinery Capacity Threshold
// =============================================================================

Deno.test("f8896.compute: capacity exactly at 205,000 bbl/day — allowed (boundary pass)", () => {
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

Deno.test("f8896.compute: multiple items — credits summed", () => {
  // Item 1: 200,000 gallons × 0.05 = 10,000
  // Item 2: 300,000 gallons × 0.05 = 15,000
  // Total: 25,000
  const result = compute([
    minimalItem({ gallons_ulsd_produced: 200_000, refinery_capacity_barrels_per_day: 50_000 }),
    minimalItem({ gallons_ulsd_produced: 300_000, refinery_capacity_barrels_per_day: 80_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 25_000);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f8896.compute: throws on over-capacity refinery", () => {
  assertThrows(() => compute([minimalItem({ gallons_ulsd_produced: 100, refinery_capacity_barrels_per_day: 300_000 })]), Error);
});

Deno.test("f8896.compute: zero gallons does not throw", () => {
  const result = compute([minimalItem({ gallons_ulsd_produced: 0, refinery_capacity_barrels_per_day: 50_000 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8896.compute: empty item — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8896.compute: only one output node (schedule3)", () => {
  const result = compute([minimalItem({ gallons_ulsd_produced: 100_000, refinery_capacity_barrels_per_day: 50_000 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8896.compute: smoke test — full calculation with capital costs limitation", () => {
  const result = compute([
    minimalItem({
      gallons_ulsd_produced: 5_000_000,
      qualified_capital_costs: 1_000_000,
      prior_year_credits_claimed: 50_000,
      refinery_capacity_barrels_per_day: 150_000,
    }),
  ]);
  // base_credit = 5,000,000 × 0.05 = 250,000
  // capital_cap = 1,000,000 × 0.25 - 50,000 = 200,000
  // credit = min(250,000, 200,000) = 200,000
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 200_000);
});
