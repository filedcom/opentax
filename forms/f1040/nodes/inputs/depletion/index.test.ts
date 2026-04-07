import { assertEquals, assertThrows } from "@std/assert";
import { depletion, PropertyType, DepletionMethod, DepletionPurpose } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { scheduleE } from "../schedule_e/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 0,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return depletion.compute({ taxYear: 2025 }, { depletions: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("depletion.inputSchema: valid minimal item passes", () => {
  const parsed = depletion.inputSchema.safeParse({ depletions: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("depletion.inputSchema: empty array fails (min 1)", () => {
  const parsed = depletion.inputSchema.safeParse({ depletions: [] });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: negative gross_income fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ gross_income: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: negative deductible_expenses fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ deductible_expenses: -50 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: negative adjusted_basis fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ adjusted_basis: -1000 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: negative units_sold fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ units_sold: -10 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: invalid property_type fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ property_type: "DIAMOND" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: invalid method fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ method: "MAGIC" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("depletion.inputSchema: invalid purpose fails", () => {
  const parsed = depletion.inputSchema.safeParse({
    depletions: [minimalItem({ purpose: "F1040" })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Percentage Depletion — Rates by Property Type
// =============================================================================

Deno.test("depletion.compute: COAL at 10% percentage depletion", () => {
  // gross_income=10000, expenses=0, net=10000, rate=10% → 1000
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 1_000);
});

Deno.test("depletion.compute: OIL_GAS at 15% percentage depletion (independent producer)", () => {
  // gross=20000, expenses=0, net=20000 (100% cap), 65% cap = 65%*100000=65000 → 3000
  const result = compute([minimalItem({
    property_type: PropertyType.OIL_GAS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 20_000,
    deductible_expenses: 0,
    units_sold: 0,
    is_independent_producer: true,
    taxable_income_before_depletion: 100_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 3_000);
});

Deno.test("depletion.compute: METALS at 15% percentage depletion", () => {
  // gross=10000, expenses=0, net=10000, rate=15% → 1500
  const result = compute([minimalItem({
    property_type: PropertyType.METALS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 1_500);
});

Deno.test("depletion.compute: OTHER_MINERAL at 14% percentage depletion", () => {
  // gross=10000, expenses=0, net=10000, rate=14% → 1400
  const result = compute([minimalItem({
    property_type: PropertyType.OTHER_MINERAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 1_400);
});

// =============================================================================
// 3. Cost Depletion
// =============================================================================

Deno.test("depletion.compute: COST method — greater-of wins (percentage > cost)", () => {
  // cost = (20000 / 100000) * 500 = 100
  // percentage = min(5000*0.10, 5000*0.50) = min(500, 2500) = 500
  // greater-of = 500 (percentage wins)
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.COST,
    gross_income: 5_000,
    deductible_expenses: 0,
    adjusted_basis: 20_000,
    estimated_reserves: 100_000,
    units_sold: 500,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 500);
});

Deno.test("depletion.compute: COST method with zero basis — percentage depletion applies", () => {
  // cost = 0 (basis=0), percentage = min(5000*0.10, 5000*0.50) = 500
  // greater-of = 500
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.COST,
    gross_income: 5_000,
    deductible_expenses: 0,
    adjusted_basis: 0,
    estimated_reserves: 100_000,
    units_sold: 500,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 500);
});

Deno.test("depletion.compute: COST method with zero reserves — percentage depletion applies", () => {
  // cost = 0 (reserves=0), percentage = min(5000*0.10, 5000*0.50) = 500
  // greater-of = 500
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.COST,
    gross_income: 5_000,
    deductible_expenses: 0,
    adjusted_basis: 10_000,
    estimated_reserves: 0,
    units_sold: 500,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 500);
});

// =============================================================================
// 4. Net Income Limitation
// =============================================================================

Deno.test("depletion.compute: COAL net income limit (50%) caps percentage depletion", () => {
  // gross=10000, expenses=8000, net=2000, 50% limit=1000
  // 10% of 10000 = 1000, cap = 50% of 2000 = 1000 → 1000
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 8_000,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 1_000);
});

Deno.test("depletion.compute: COAL percentage depletion capped when net income too low", () => {
  // gross=10000, expenses=9500, net=500, 50% limit=250
  // 10% of 10000 = 1000, but capped at 250
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 9_500,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 250);
});

Deno.test("depletion.compute: zero net income → no percentage depletion", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 5_000,
    deductible_expenses: 5_000,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("depletion.compute: OIL_GAS net income limit is 100% (not 50%)", () => {
  // gross=10000, expenses=5000, net=5000, 100% limit=5000
  // 15% of 10000=1500 → no cap from net income (1500 < 5000)
  const result = compute([minimalItem({
    property_type: PropertyType.OIL_GAS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 5_000,
    units_sold: 0,
    is_independent_producer: true,
    taxable_income_before_depletion: 100_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 1_500);
});

// =============================================================================
// 5. 65% Taxable Income Limitation (OIL_GAS only)
// =============================================================================

Deno.test("depletion.compute: OIL_GAS 65% taxable income cap applies", () => {
  // gross=100000, expenses=0, net=100000, 15%=15000
  // taxable_income=10000, 65% cap=6500 → deduction=6500
  const result = compute([minimalItem({
    property_type: PropertyType.OIL_GAS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 100_000,
    deductible_expenses: 0,
    units_sold: 0,
    is_independent_producer: true,
    taxable_income_before_depletion: 10_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 6_500);
});

Deno.test("depletion.compute: COAL not subject to 65% taxable income cap", () => {
  // gross=100000, expenses=0, net=100000, 50%cap=50000, rate=10%→10000
  // No 65% taxable income cap for coal
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 100_000,
    deductible_expenses: 0,
    units_sold: 0,
    taxable_income_before_depletion: 5_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 10_000);
});

// =============================================================================
// 6. Output Routing
// =============================================================================

Deno.test("depletion.compute: purpose SCHEDULE_E → routes to schedule_e with correct expense_depletion", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  assertEquals(fieldsOf(result.outputs, scheduleE)!.expense_depletion, 1_000);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

Deno.test("depletion.compute: purpose SCHEDULE_C → routes to schedule_c with correct line_12_depletion", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_C,
  })]);
  assertEquals(fieldsOf(result.outputs, scheduleC)!.line_12_depletion, 1_000);
  assertEquals(findOutput(result, "schedule_e"), undefined);
});

Deno.test("depletion.compute: zero deduction → no output", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 0,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("depletion.compute: SCHEDULE_C routes to line_12_depletion field", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_C,
  })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_12_depletion, 1_000);
});

// =============================================================================
// 7. Aggregation — Multiple Properties
// =============================================================================

Deno.test("depletion.compute: multiple SCHEDULE_E properties — deductions aggregated", () => {
  const result = compute([
    minimalItem({
      property_type: PropertyType.COAL,
      method: DepletionMethod.PERCENTAGE,
      gross_income: 10_000,
      deductible_expenses: 0,
      units_sold: 0,
      purpose: DepletionPurpose.SCHEDULE_E,
    }),
    minimalItem({
      property_type: PropertyType.METALS,
      method: DepletionMethod.PERCENTAGE,
      gross_income: 10_000,
      deductible_expenses: 0,
      units_sold: 0,
      purpose: DepletionPurpose.SCHEDULE_E,
    }),
  ]);
  // COAL: 10% of 10000 = 1000; METALS: 15% of 10000 = 1500; total = 2500
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 2_500);
});

Deno.test("depletion.compute: mixed SCHEDULE_C and SCHEDULE_E → two separate outputs", () => {
  const result = compute([
    minimalItem({
      property_type: PropertyType.COAL,
      method: DepletionMethod.PERCENTAGE,
      gross_income: 10_000,
      deductible_expenses: 0,
      units_sold: 0,
      purpose: DepletionPurpose.SCHEDULE_C,
    }),
    minimalItem({
      property_type: PropertyType.METALS,
      method: DepletionMethod.PERCENTAGE,
      gross_income: 10_000,
      deductible_expenses: 0,
      units_sold: 0,
      purpose: DepletionPurpose.SCHEDULE_E,
    }),
  ]);
  assertEquals(result.outputs.length, 2);
  const cFields = fieldsOf(result.outputs, scheduleC)!;
  const eFields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(cFields.line_12_depletion, 1_000);
  assertEquals(eFields.expense_depletion, 1_500);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

Deno.test("depletion.compute: OIL_GAS non-independent-producer → no percentage depletion", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.OIL_GAS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 50_000,
    deductible_expenses: 0,
    units_sold: 0,
    is_independent_producer: false,
    taxable_income_before_depletion: 100_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("depletion.compute: COST method: percentage=0 (non-independent OIL_GAS), cost wins", () => {
  // COST: basis=50000, reserves=1000000, units_sold=1000 → cost = 50
  // percentage = 0 (non-independent OIL_GAS — §613A(c) requires independent producer)
  // greater-of = 50 (cost wins because percentage is 0)
  const result = compute([minimalItem({
    property_type: PropertyType.OIL_GAS,
    method: DepletionMethod.COST,
    gross_income: 100_000,
    deductible_expenses: 0,
    adjusted_basis: 50_000,
    estimated_reserves: 1_000_000,
    units_sold: 1_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 50);
});

// =============================================================================
// 9. Greater of Cost vs Percentage (IRC §611 — taxpayer must take the greater)
// =============================================================================

Deno.test("depletion.compute: greater of — COST item where percentage wins (COAL)", () => {
  // COAL, method=COST, adjusted_basis=1000, estimated_reserves=100000, units_sold=500
  // gross_income=50000, deductible_expenses=10000
  // cost = (1000/100000)*500 = 5
  // percentage = min(50000*0.10, (50000-10000)*0.50) = min(5000, 20000) = 5000
  // greater-of = 5000 (percentage wins even though method=COST)
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.COST,
    gross_income: 50_000,
    deductible_expenses: 10_000,
    adjusted_basis: 1_000,
    estimated_reserves: 100_000,
    units_sold: 500,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 5_000);
});

Deno.test("depletion.compute: greater of — PERCENTAGE item where cost wins (METALS)", () => {
  // METALS, method=PERCENTAGE, adjusted_basis=100000, estimated_reserves=1000, units_sold=800
  // gross_income=5000, deductible_expenses=4000
  // cost = (100000/1000)*800 = 80000
  // percentage = min(5000*0.15, (5000-4000)*0.50) = min(750, 500) = 500
  // greater-of = 80000 (cost wins even though method=PERCENTAGE)
  const result = compute([minimalItem({
    property_type: PropertyType.METALS,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 5_000,
    deductible_expenses: 4_000,
    adjusted_basis: 100_000,
    estimated_reserves: 1_000,
    units_sold: 800,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 80_000);
});

Deno.test("depletion.compute: greater of — both methods yield same value", () => {
  // OTHER_MINERAL, method=COST
  // cost = (14000/100000)*1000 = 140
  // percentage = min(1000*0.14, 1000*0.50) = min(140, 500) = 140
  // greater-of = 140 (tie)
  const result = compute([minimalItem({
    property_type: PropertyType.OTHER_MINERAL,
    method: DepletionMethod.COST,
    gross_income: 1_000,
    deductible_expenses: 0,
    adjusted_basis: 14_000,
    estimated_reserves: 100_000,
    units_sold: 1_000,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_depletion, 140);
});

// =============================================================================
// 10. Smoke Test
// =============================================================================

Deno.test("depletion.compute: smoke test — two properties, cost and percentage", () => {
  const result = compute([
    // Property 1: coal royalty on Schedule E — percentage depletion
    minimalItem({
      property_type: PropertyType.COAL,
      method: DepletionMethod.PERCENTAGE,
      gross_income: 20_000,
      deductible_expenses: 4_000,
      units_sold: 0,
      purpose: DepletionPurpose.SCHEDULE_E,
      // net=16000, 50%cap=8000, 10%of20000=2000 → 2000
    }),
    // Property 2: oil business on Schedule C — greater-of applies
    minimalItem({
      property_type: PropertyType.OIL_GAS,
      method: DepletionMethod.COST,
      gross_income: 50_000,
      deductible_expenses: 0,
      adjusted_basis: 100_000,
      estimated_reserves: 500_000,
      units_sold: 2_500,
      is_independent_producer: true,
      taxable_income_before_depletion: 200_000,
      purpose: DepletionPurpose.SCHEDULE_C,
      // cost=500, pct=min(50000*0.15, 50000*1.0)=min(7500,50000)=7500, 65% cap=130000 (not binding)
      // greater-of = 7500
    }),
  ]);

  assertEquals(result.outputs.length, 2);
  const eFields = fieldsOf(result.outputs, scheduleE)!;
  const cFields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(eFields.expense_depletion, 2_000);
  assertEquals(cFields.line_12_depletion, 7_500);
});
