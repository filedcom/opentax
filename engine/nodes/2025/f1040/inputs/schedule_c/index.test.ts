// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton (e.g. `scheduleC`)
//   2. The input wrapper key (e.g. `schedule_cs`) matches compute()'s parameter
//   3. The nodeType strings used below — verify against actual node routing strings:
//      - Schedule 1 output: likely "schedule1" — verify
//      - Schedule SE output: likely "schedule_se" — verify
//      - Form 8995 / QBI output: likely "form8995" — verify
//      - Form 8582 (passive): likely "form8582" — verify
//      - Form 6198 (at-risk): likely "form6198" — verify
//      - Form 6251 (AMT/depletion): likely "form6251" — verify
//      - Form 8990 (business interest): likely "form8990" — verify
//      - Form 461 (excess business loss): likely "form461" — verify
//   4. AMBIGUITIES (must resolve against implementation before running):
//      a. meals_dot_worker / meals_as_wages field names — context does not specify exact names
//      b. large_business flag for §163(j) — may be computed from gross receipts or a boolean
//      c. clergy_schedule_c SE threshold ($108.28) — verify how clergy flag affects SE routing
//      d. line_30_home_office — verify whether node accepts dollar amount directly or sq_ft input
//      e. line_32_at_risk behavior when there is NO net loss — may be ignored or may throw
// These tests define the IRS-correct behaviour — if a test fails, fix the implementation, not the test.

import { assertEquals, assertThrows } from "@std/assert";
import { scheduleC, itemSchema } from "./index.ts";
import { z } from "zod";

// ============================================================
// Helpers
// ============================================================

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_1_gross_receipts: 0,
    ...overrides,
  };
}

function compute(items: z.infer<typeof itemSchema>[]) {
  return scheduleC.compute({ schedule_cs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema_missing_line_a: omitting line_a_principal_business fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [{
      line_b_business_code: "541510",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 10000,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_missing_line_b: omitting line_b_business_code fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [{
      line_a_principal_business: "Consulting",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 10000,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_missing_line_f: omitting line_f_accounting_method fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541510",
      line_g_material_participation: true,
      line_1_gross_receipts: 10000,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_missing_line_g: omitting line_g_material_participation fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541510",
      line_f_accounting_method: "cash",
      line_1_gross_receipts: 10000,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_missing_line_1: omitting line_1_gross_receipts fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [{
      line_a_principal_business: "Consulting",
      line_b_business_code: "541510",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_negative_gross_receipts: line_1_gross_receipts = -1 fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [minimalItem({ line_1_gross_receipts: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_negative_returns_allowances: line_2_returns_allowances = -1 fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [minimalItem({ line_1_gross_receipts: 10000, line_2_returns_allowances: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_negative_expense: line_8_advertising = -500 fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [minimalItem({ line_1_gross_receipts: 10000, line_8_advertising: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_invalid_accounting_method: 'FIFO' fails validation", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [minimalItem({ line_f_accounting_method: "FIFO" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_empty_array: empty schedule_cs array does not throw", () => {
  const result = scheduleC.compute({ schedule_cs: [] });
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema_valid_minimal: valid minimal item passes schema", () => {
  const parsed = scheduleC.inputSchema.safeParse({
    schedule_cs: [minimalItem({ line_1_gross_receipts: 10000 })],
  });
  assertEquals(parsed.success, true);
});

// ============================================================
// 2. Per-Box Routing
// ============================================================

Deno.test("routing_gross_receipts_to_schedule1: income-only item routes to schedule1", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000 })]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("routing_returns_allowances_reduce_net_sales: line_1=10000, line_2=2000 → net_sales=8000", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_2_returns_allowances: 2000 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 8000);
});

Deno.test("routing_line_6_other_income_adds_to_gross: line_1=5000, line_6=500 → gross_income=5500", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 5000, line_6_other_income: 500 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 5500);
});

Deno.test("routing_advertising_reduces_net_profit: advertising=1000 on 10000 receipts → profit=9000", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_8_advertising: 1000 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 9000);
});

Deno.test("routing_meals_50pct_default: meals=1000, no special flag → deductible=500", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_24b_meals: 1000 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // net = 10000 - 500 = 9500
  assertEquals(input.line3_schedule_c, 9500);
});

Deno.test("routing_meals_80pct_dot_worker: meals=1000, dot_worker → deductible=800", () => {
  // AMBIGUITY: field name for DOT worker flag — verify against implementation
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_24b_meals: 1000, meals_dot_worker: true })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // net = 10000 - 800 = 9200
  assertEquals(input.line3_schedule_c, 9200);
});

Deno.test("routing_meals_100pct_as_wages: meals=1000, meals_as_wages → deductible=1000", () => {
  // AMBIGUITY: field name for meals-as-wages flag — verify against implementation
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_24b_meals: 1000, meals_as_wages: true })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // net = 10000 - 1000 = 9000
  assertEquals(input.line3_schedule_c, 9000);
});

Deno.test("routing_meals_zero_no_impact: meals=0 → deductible contribution=0", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_24b_meals: 0 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 10000);
});

Deno.test("routing_home_office_reduces_net_profit: home_office=500 on 10000 receipts → profit=9500", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_30_home_office: 500 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 9500);
});

Deno.test("routing_statutory_employee_suppresses_se: statutory_employee=true → no schedule_se output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, statutory_employee: true })]);
  const se = findOutput(result, "schedule_se");
  assertEquals(se, undefined);
  // profit still flows to schedule1
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("routing_exempt_notary_suppresses_se: exempt_notary=true → no schedule_se output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, exempt_notary: true })]);
  const se = findOutput(result, "schedule_se");
  assertEquals(se, undefined);
});

Deno.test("routing_paper_route_suppresses_se: paper_route=true → no schedule_se output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, paper_route: true })]);
  const se = findOutput(result, "schedule_se");
  assertEquals(se, undefined);
});

Deno.test("routing_passive_activity_routes_to_form8582: line_g=false → form8582 output exists", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_g_material_participation: false })]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582 !== undefined, true);
});

Deno.test("routing_active_business_no_form8582: line_g=true → no form8582 output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_g_material_participation: true })]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
});

Deno.test("routing_at_risk_b_with_loss_routes_form6198: loss + at_risk=b → form6198 exists", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 5000,
    line_8_advertising: 20000,
    line_32_at_risk: "b",
  })]);
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198 !== undefined, true);
});

Deno.test("routing_at_risk_a_with_loss_no_form6198: loss + at_risk=a → no form6198", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 5000,
    line_8_advertising: 20000,
    line_32_at_risk: "a",
  })]);
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198, undefined);
});

Deno.test("routing_depletion_nonzero_routes_form6251: depletion=1000 → form6251 output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_12_depletion: 1000 })]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251 !== undefined, true);
});

Deno.test("routing_depletion_zero_no_form6251: depletion=0 → no form6251 output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_12_depletion: 0 })]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251, undefined);
});

Deno.test("routing_profit_400_triggers_se: net_profit=400 → schedule_se output exists", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 400 })]);
  const se = findOutput(result, "schedule_se");
  assertEquals(se !== undefined, true);
});

Deno.test("routing_profit_below_400_no_se: net_profit=399 → no schedule_se output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 399 })]);
  const se = findOutput(result, "schedule_se");
  assertEquals(se, undefined);
});

Deno.test("routing_profit_routes_form8995: net_profit > 0, normal scenario → form8995 output", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000 })]);
  const qbi = findOutput(result, "form8995");
  assertEquals(qbi !== undefined, true);
});

Deno.test("routing_gambler_loss_capped_at_zero: professional_gambler with loss → line31=0", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 5000,
    line_8_advertising: 20000,
    professional_gambler: true,
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 0);
});

Deno.test("routing_gambler_with_profit_routes_normally: professional_gambler, profit=1000 → schedule1 shows 1000", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 1000, professional_gambler: true })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 1000);
});

Deno.test("routing_interest_small_biz_no_form8990: interest expense, no large_business flag → no form8990", () => {
  // AMBIGUITY: small business is default; no large_business flag → form8990 should not appear
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_16b_interest_other: 5000 })]);
  const f8990 = findOutput(result, "form8990");
  assertEquals(f8990, undefined);
});

Deno.test("routing_interest_large_biz_triggers_form8990: §163(j) applicable → form8990 output", () => {
  // AMBIGUITY: field name for large_business / §163(j) applicability flag — verify against implementation
  const result = compute([minimalItem({
    line_1_gross_receipts: 50000,
    line_16b_interest_other: 5000,
    subject_to_163j: true,
  })]);
  const f8990 = findOutput(result, "form8990");
  assertEquals(f8990 !== undefined, true);
});

// ============================================================
// 3. Aggregation
// ============================================================

Deno.test("agg_multiple_instances_to_schedule1: two businesses → schedule1 shows combined net profit", () => {
  const result = compute([
    minimalItem({ line_1_gross_receipts: 60000 }),
    minimalItem({ line_1_gross_receipts: 40000 }),
  ]);
  // Each instance routes separately; aggregate on schedule1 = 100000
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 100000);
});

Deno.test("agg_cogs_reduces_gross_profit: COGS=800, line_1=5000 → net_profit=4200", () => {
  // COGS = 35+36+37+38+39 - line_41
  // line35=100, line36=500, line37=100, line38=50, line39=50 → line40=800; line41=0 → COGS=800
  const result = compute([minimalItem({
    line_1_gross_receipts: 5000,
    line_35_cogs_beginning_inventory: 100,
    line_36_purchases: 500,
    line_37_cost_of_labor: 100,
    line_38_materials_supplies_cogs: 50,
    line_39_other_cogs: 50,
    line_41_cogs_ending_inventory: 0,
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 4200);
});

Deno.test("agg_all_expense_lines_sum: multiple expense lines each 1000 → correct reduced profit", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 20000,
    line_8_advertising: 1000,
    line_10_commissions_fees: 1000,
    line_11_contract_labor: 1000,
    line_15_insurance: 1000,
    line_18_office_expense: 1000,
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 15000);
});

Deno.test("agg_part_v_other_expenses_flows_to_line27b: two items [500,300] → reduces profit by 800", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 10000,
    part_v_other_expenses: [
      { description: "Software tools", amount: 500 },
      { description: "Amortization", amount: 300 },
    ],
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 9200);
});

// ============================================================
// 4. Thresholds
// ============================================================

Deno.test("threshold_se_below_400: net_profit=399 → no schedule_se", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 399 })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

Deno.test("threshold_se_at_400: net_profit=400 → triggers schedule_se", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 400 })]);
  assertEquals(findOutput(result, "schedule_se") !== undefined, true);
});

Deno.test("threshold_se_above_400: net_profit=500 → triggers schedule_se", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 500 })]);
  assertEquals(findOutput(result, "schedule_se") !== undefined, true);
});

Deno.test("threshold_clergy_se_below_108_28: clergy=true, net_profit=108 → no schedule_se", () => {
  // AMBIGUITY: verify clergy_schedule_c exact field name and SE threshold logic
  const result = compute([minimalItem({
    line_1_gross_receipts: 108,
    clergy_schedule_c: true,
  })]);
  assertEquals(findOutput(result, "schedule_se"), undefined);
});

Deno.test("threshold_clergy_se_at_108_28: clergy=true, net_profit=108.28 → triggers schedule_se", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 108.28,
    clergy_schedule_c: true,
  })]);
  assertEquals(findOutput(result, "schedule_se") !== undefined, true);
});

Deno.test("threshold_home_office_max_300sqft: 350sqft × $5 capped at $1500", () => {
  // AMBIGUITY: if node accepts sq_ft input for simplified method; otherwise this may not apply
  // If node accepts line_30_home_office as pre-computed dollar amount, skip sq_ft logic
  const result = compute([minimalItem({
    line_1_gross_receipts: 50000,
    home_office_sq_ft: 350,
    home_office_method: "simplified",
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // 350 sq_ft capped at 300 × $5 = $1500
  assertEquals(input.line3_schedule_c, 48500);
});

Deno.test("threshold_home_office_below_max: 200sqft × $5 = $1000", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 50000,
    home_office_sq_ft: 200,
    home_office_method: "simplified",
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 49000);
});

Deno.test("threshold_home_office_gross_income_cap: home_office > tentative_profit → capped at tentative profit", () => {
  // line_1=3000, home_office=5000 → tentative_profit=3000, deduction capped at 3000
  const result = compute([minimalItem({ line_1_gross_receipts: 3000, line_30_home_office: 5000 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // net profit after capped home office = 3000 - 3000 = 0
  assertEquals(input.line3_schedule_c, 0);
});

Deno.test("threshold_excess_business_loss_single_313k: loss > $313k → routes to form461", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 0,
    line_8_advertising: 400000,
    filing_status: "single",
  })]);
  const f461 = findOutput(result, "form461");
  assertEquals(f461 !== undefined, true);
});

Deno.test("threshold_excess_business_loss_below_313k: loss < $313k → no form461", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 0,
    line_8_advertising: 100000,
    filing_status: "single",
  })]);
  const f461 = findOutput(result, "form461");
  assertEquals(f461, undefined);
});

// ============================================================
// 5. Hard Validation Rules
// ============================================================

Deno.test("hard_validation_negative_gross_receipts_throws: line_1=-1 → throws", () => {
  assertThrows(() => {
    compute([minimalItem({ line_1_gross_receipts: -1 })]);
  }, Error);
});

Deno.test("hard_validation_zero_gross_receipts_ok: line_1=0 → does not throw", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hard_validation_negative_expense_throws: line_8_advertising=-1 → throws", () => {
  assertThrows(() => {
    compute([minimalItem({ line_1_gross_receipts: 10000, line_8_advertising: -1 })]);
  }, Error);
});

Deno.test("hard_validation_zero_expense_ok: line_8_advertising=0 → does not throw", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 10000, line_8_advertising: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 6. Warning-Only Rules (must NOT throw)
// ============================================================

Deno.test("warning_passive_activity_no_throw: line_g=false → does not throw", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, line_g_material_participation: false })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning_gambler_loss_no_throw: professional_gambler with net loss → does not throw", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 1000,
    line_8_advertising: 5000,
    professional_gambler: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning_at_risk_b_loss_no_throw: at_risk=b with net loss → does not throw", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 1000,
    line_8_advertising: 5000,
    line_32_at_risk: "b",
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning_inventory_change_yes_no_throw: line_34_inventory_change=true → does not throw", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 50000,
    line_34_inventory_change: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning_disposed_of_business_no_throw: disposed_of_business=true → does not throw", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, disposed_of_business: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning_clergy_schedule_c_no_throw: clergy_schedule_c=true → does not throw", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 50000, clergy_schedule_c: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 7. Informational Fields (output count unchanged)
// ============================================================

Deno.test("info_line_a_change_no_output_change: changing line_a does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withA = compute([minimalItem({ line_1_gross_receipts: 10000, line_a_principal_business: "Different" })]);
  assertEquals(base.outputs.length, withA.outputs.length);
});

Deno.test("info_line_b_change_no_output_change: changing line_b does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withB = compute([minimalItem({ line_1_gross_receipts: 10000, line_b_business_code: "722511" })]);
  assertEquals(base.outputs.length, withB.outputs.length);
});

Deno.test("info_line_c_no_output_change: adding line_c_business_name does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withC = compute([minimalItem({ line_1_gross_receipts: 10000, line_c_business_name: "Acme LLC" })]);
  assertEquals(base.outputs.length, withC.outputs.length);
});

Deno.test("info_line_d_ein_no_output_change: adding line_d_ein does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withEIN = compute([minimalItem({ line_1_gross_receipts: 10000, line_d_ein: "12-3456789" })]);
  assertEquals(base.outputs.length, withEIN.outputs.length);
});

Deno.test("info_line_e_address_no_output_change: adding line_e_business_address does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withAddr = compute([minimalItem({ line_1_gross_receipts: 10000, line_e_business_address: "123 Main St" })]);
  assertEquals(base.outputs.length, withAddr.outputs.length);
});

Deno.test("info_line_h_new_business_no_output_change: line_h_new_business=true does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withH = compute([minimalItem({ line_1_gross_receipts: 10000, line_h_new_business: true })]);
  assertEquals(base.outputs.length, withH.outputs.length);
});

Deno.test("info_line_i_1099_payments_no_output_change: line_i_made_1099_payments does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withI = compute([minimalItem({ line_1_gross_receipts: 10000, line_i_made_1099_payments: true })]);
  assertEquals(base.outputs.length, withI.outputs.length);
});

Deno.test("info_line_j_filed_1099s_no_output_change: line_j_filed_1099s does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withJ = compute([minimalItem({ line_1_gross_receipts: 10000, line_j_filed_1099s: true })]);
  assertEquals(base.outputs.length, withJ.outputs.length);
});

Deno.test("info_multi_form_code_no_output_change: multi_form_code does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withMFC = compute([minimalItem({ line_1_gross_receipts: 10000, multi_form_code: "1" })]);
  assertEquals(base.outputs.length, withMFC.outputs.length);
});

Deno.test("info_disposed_no_output_change: disposed_of_business does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withDisposed = compute([minimalItem({ line_1_gross_receipts: 10000, disposed_of_business: true })]);
  assertEquals(base.outputs.length, withDisposed.outputs.length);
});

Deno.test("info_llc_number_no_output_change: llc_number does not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withLLC = compute([minimalItem({ line_1_gross_receipts: 10000, llc_number: 1 })]);
  assertEquals(base.outputs.length, withLLC.outputs.length);
});

Deno.test("info_part_iv_vehicle_no_output_change: Part IV vehicle info fields do not change output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withVehicle = compute([minimalItem({
    line_1_gross_receipts: 10000,
    line_43_date_in_service: "01/15/2025",
    line_44a_total_miles: 15000,
    line_44b_business_miles: 8000,
    line_44c_commuting_miles: 3000,
    line_44d_other_miles: 4000,
    line_45_personal_use: true,
    line_46_another_vehicle: false,
    line_47a_evidence: true,
    line_47b_written_evidence: true,
  })]);
  assertEquals(base.outputs.length, withVehicle.outputs.length);
});

// ============================================================
// 8. Edge Cases
// ============================================================

Deno.test("edge_multiple_instances_one_profit_one_loss: combined net flows to schedule1", () => {
  const result = compute([
    minimalItem({ line_1_gross_receipts: 5000 }),
    minimalItem({ line_1_gross_receipts: 1000, line_8_advertising: 3000 }),
  ]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  // business1 profit=5000, business2 loss=-2000 → net=3000
  assertEquals(input.line3_schedule_c, 3000);
});

Deno.test("edge_passive_with_profit_routes_se: line_g=false, profit=1000 → still routes to schedule1 and schedule_se", () => {
  const result = compute([minimalItem({ line_1_gross_receipts: 1000, line_g_material_participation: false })]);
  const s1 = findOutput(result, "schedule1");
  const se = findOutput(result, "schedule_se");
  assertEquals(s1 !== undefined, true);
  assertEquals(se !== undefined, true);
});

Deno.test("edge_statutory_and_normal_two_instances: one suppresses SE, other does not", () => {
  const result = compute([
    minimalItem({ line_1_gross_receipts: 50000, statutory_employee: true }),
    minimalItem({ line_1_gross_receipts: 10000 }),
  ]);
  // schedule_se should exist for the non-statutory instance
  const se = findOutput(result, "schedule_se");
  assertEquals(se !== undefined, true);
});

Deno.test("edge_home_office_capped_at_tentative_profit: home_office > profit → capped, does not throw", () => {
  // line_1=2000, home_office=5000 → deduction capped at 2000, net = 0
  const result = compute([minimalItem({ line_1_gross_receipts: 2000, line_30_home_office: 5000 })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, 0);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("edge_nil_income_routes_same_as_regular: NIL income on line_1 routes normally", () => {
  // Student-athlete NIL income is reported on line_1; routing is identical
  const result = compute([minimalItem({ line_1_gross_receipts: 25000 })]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const se = findOutput(result, "schedule_se");
  assertEquals(se !== undefined, true);
});

Deno.test("edge_part_v_empty_array_no_change: empty part_v_other_expenses does not affect output count", () => {
  const base = compute([minimalItem({ line_1_gross_receipts: 10000 })]);
  const withEmpty = compute([minimalItem({ line_1_gross_receipts: 10000, part_v_other_expenses: [] })]);
  assertEquals(base.outputs.length, withEmpty.outputs.length);
});

Deno.test("edge_cogs_large_enough_for_net_loss: inventory > receipts → schedule1 shows negative value", () => {
  // COGS = line36=50000, line_1=10000 → gross_profit = -40000 → net_loss
  const result = compute([minimalItem({
    line_1_gross_receipts: 10000,
    line_36_purchases: 50000,
    line_41_cogs_ending_inventory: 0,
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c < 0, true);
});

Deno.test("edge_non_gambler_negative_net_profit: loss flows through uncapped", () => {
  const result = compute([minimalItem({
    line_1_gross_receipts: 5000,
    line_8_advertising: 20000,
  })]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.input as Record<string, number>;
  assertEquals(input.line3_schedule_c, -15000);
});

// ============================================================
// 9. Smoke Test
// ============================================================

Deno.test("smoke_comprehensive_all_major_boxes: full Schedule C computes correct net profit and routes all downstream", () => {
  // Setup:
  //   line_1=100000, line_2=1000 → net_sales=99000
  //   line_6_other_income=500 → gross_income=99500 (no COGS)
  //   line_8_advertising=2000
  //   line_9_car_truck=3000
  //   line_10_commissions_fees=1000
  //   line_13_depreciation=5000
  //   line_22_supplies=2000
  //   line_24b_meals=2000 (50% = 1000)
  //   line_26_wages=10000
  //   line_30_home_office=1500
  //   total_expenses = 2000+3000+1000+5000+2000+1000+10000 = 24000
  //   tentative_profit (line29) = 99500 - 24000 = 75500
  //   net_profit (line31) = 75500 - 1500 = 74000
  const result = compute([{
    line_a_principal_business: "Software Consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash" as const,
    line_g_material_participation: true,
    line_1_gross_receipts: 100000,
    line_2_returns_allowances: 1000,
    line_6_other_income: 500,
    line_8_advertising: 2000,
    line_9_car_truck_expenses: 3000,
    line_10_commissions_fees: 1000,
    line_13_depreciation: 5000,
    line_22_supplies: 2000,
    line_24b_meals: 2000,
    line_26_wages: 10000,
    line_30_home_office: 1500,
  }]);

  // Net profit routes to schedule1
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const s1Input = s1!.input as Record<string, number>;
  assertEquals(s1Input.line3_schedule_c, 74000);

  // Net profit >= $400 → schedule_se
  const se = findOutput(result, "schedule_se");
  assertEquals(se !== undefined, true);

  // QBI eligible → form8995
  const qbi = findOutput(result, "form8995");
  assertEquals(qbi !== undefined, true);

  // Active business → no form8582
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);

  // No depletion → no form6251
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251, undefined);
});
