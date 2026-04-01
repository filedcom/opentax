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

Deno.test("depletion.compute: COST method — cost depletion formula", () => {
  // cost = (20000 / 100000) * 500 = 100
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
  assertEquals(fields.expense_depletion, 100);
});

Deno.test("depletion.compute: COST method with zero basis — no deduction", () => {
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
  assertEquals(result.outputs.length, 0);
});

Deno.test("depletion.compute: COST method with zero reserves — no deduction", () => {
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
  assertEquals(result.outputs.length, 0);
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

Deno.test("depletion.compute: purpose SCHEDULE_E → routes to schedule_e", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_E,
  })]);
  const sch_e = findOutput(result, "schedule_e");
  const sch_c = findOutput(result, "schedule_c");
  assertEquals(sch_e !== undefined, true);
  assertEquals(sch_c, undefined);
});

Deno.test("depletion.compute: purpose SCHEDULE_C → routes to schedule_c", () => {
  const result = compute([minimalItem({
    property_type: PropertyType.COAL,
    method: DepletionMethod.PERCENTAGE,
    gross_income: 10_000,
    deductible_expenses: 0,
    units_sold: 0,
    purpose: DepletionPurpose.SCHEDULE_C,
  })]);
  const sch_c = findOutput(result, "schedule_c");
  const sch_e = findOutput(result, "schedule_e");
  assertEquals(sch_c !== undefined, true);
  assertEquals(sch_e, undefined);
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

Deno.test("depletion.compute: COST method ignores percentage depletion rate entirely", () => {
  // COST: basis=50000, reserves=1000000, units_sold=1000 → cost = 50
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
// 9. Smoke Test
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
    // Property 2: oil business on Schedule C — cost depletion
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
      // cost = (100000/500000)*2500 = 500
    }),
  ]);

  assertEquals(result.outputs.length, 2);
  const eFields = fieldsOf(result.outputs, scheduleE)!;
  const cFields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(eFields.expense_depletion, 2_000);
  assertEquals(cFields.line_12_depletion, 500);
});
