// UNRESOLVED ITEMS:
//   - line_18_itemize_checkbox: not in schema

import { assertEquals, assertThrows } from "@std/assert";
import { scheduleA } from "./index.ts";
import { FilingStatus } from "../../types.ts";

type ScheduleAInput = Parameters<typeof scheduleA.compute>[1];

function compute(input: ScheduleAInput) {
  return scheduleA.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function deductionInput(
  result: ReturnType<typeof compute>,
): Record<string, number> {
  return findOutput(result, "standard_deduction")!.fields as Record<
    string,
    number
  >;
}

// =============================================================================
// 1. INPUT SCHEMA VALIDATION — one representative check per rule
// =============================================================================

Deno.test("scheduleA.inputSchema: empty object is valid — all fields optional", () => {
  const parsed = scheduleA.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("scheduleA.compute: Pub. 526 capital-gain election refigures older property carryover", () => {
  const result = compute({
    agi: 60_000,
    capital_gain_50_percent_election_confirmed: true,
    current_noncash_gift_inventory_complete_confirmed: true,
    other_prior_charitable_carryovers_absent_confirmed: true,
    noncash_contribution_items: [{
      source: "2025 investment land to 50%-limit organization",
      contribution_id: "land-2025",
      amount: 24_000,
      category: "noncash_50",
      is_capital_gain_property: true,
      original_fmv: 25_000,
      adjusted_basis: 24_000,
      capital_gain_reduction_election_confirmed: true,
    }],
    capital_gain_property_carryovers: [{
      contribution_id: "land-2024",
      contribution_year: 2024,
      original_category: "capital_gain_30",
      original_fmv: 27_000,
      adjusted_basis: 20_000,
      previously_deducted: 15_000,
      ordinary_carryover_rules_confirmed: true,
    }],
  });
  assertEquals(deductionInput(result).itemized_deductions, 29_000);
  assertEquals(
    result.finalizations?.[0]?.fields.line_12_noncash_contributions,
    24_000,
  );
  assertEquals(
    result.finalizations?.[0]?.fields.line_13_contribution_carryover,
    5_000,
  );
  assertEquals(
    result.carryforwards?.["charitable_capital_gain_2024_land-2024"],
    0,
  );
});

Deno.test("scheduleA.inputSchema: elected current gifts need complete item classification and an explicit prior ledger", () => {
  const elected = {
    source: "investment land",
    contribution_id: "land",
    amount: 24_000,
    category: "noncash_50" as const,
    is_capital_gain_property: true,
    original_fmv: 25_000,
    adjusted_basis: 24_000,
    capital_gain_reduction_election_confirmed: true as const,
  };
  assertEquals(
    scheduleA.inputSchema.safeParse({
      noncash_contribution_items: [elected],
    }).success,
    false,
  );
  assertEquals(
    scheduleA.inputSchema.safeParse({
      noncash_contribution_items: [elected, {
        source: "other capital property",
        contribution_id: "other",
        amount: 500,
        category: "capital_gain_30",
        is_capital_gain_property: true,
      }],
      capital_gain_property_carryovers: [],
    }).success,
    false,
  );
});

Deno.test("scheduleA.compute: no-appreciation capital property still participates in a return-wide 50% election", () => {
  const result = compute({
    agi: 20_000,
    current_noncash_gift_inventory_complete_confirmed: true,
    other_prior_charitable_carryovers_absent_confirmed: true,
    noncash_contribution_items: [{
      source: "investment property at basis",
      contribution_id: "property-at-basis",
      amount: 3_000,
      category: "noncash_50",
      is_capital_gain_property: true,
      original_fmv: 3_000,
      adjusted_basis: 3_000,
    }],
    capital_gain_property_carryovers: [],
  });
  assertEquals(
    result.finalizations?.[0]?.fields.line_12_noncash_contributions,
    3_000,
  );
  assertEquals(
    result.finalizations?.[0]?.fields.capital_gain_election_finalized,
    true,
  );
});

Deno.test("scheduleA.compute: fifth-year elected carryover expires after its last eligible deduction year", () => {
  const result = compute({
    agi: 0,
    capital_gain_50_percent_election_confirmed: true,
    current_noncash_gift_inventory_complete_confirmed: true,
    other_prior_charitable_carryovers_absent_confirmed: true,
    capital_gain_property_carryovers: [{
      contribution_id: "old-land",
      contribution_year: 2020,
      original_category: "capital_gain_30",
      original_fmv: 10_000,
      adjusted_basis: 8_000,
      previously_deducted: 2_000,
      ordinary_carryover_rules_confirmed: true,
    }],
  });
  assertEquals(
    result.finalizations?.[0]?.fields.line_13_contribution_carryover,
    0,
  );
  assertEquals(
    result.carryforwards?.["charitable_capital_gain_2020_old-land"],
    undefined,
  );
});

Deno.test("scheduleA.compute: elected capital-gain carryovers use oldest property first", () => {
  const result = compute({
    agi: 20_000,
    capital_gain_50_percent_election_confirmed: true,
    current_noncash_gift_inventory_complete_confirmed: true,
    other_prior_charitable_carryovers_absent_confirmed: true,
    noncash_contribution_items: [{
      source: "current clothing",
      contribution_id: "clothing-2025",
      amount: 5_000,
      category: "noncash_50",
      is_capital_gain_property: false,
    }],
    capital_gain_property_carryovers: [
      {
        contribution_id: "newer-land",
        contribution_year: 2024,
        original_category: "capital_gain_30",
        original_fmv: 8_000,
        adjusted_basis: 6_000,
        previously_deducted: 1_000,
        ordinary_carryover_rules_confirmed: true,
      },
      {
        contribution_id: "older-land",
        contribution_year: 2023,
        original_category: "capital_gain_30",
        original_fmv: 8_000,
        adjusted_basis: 6_000,
        previously_deducted: 1_000,
        ordinary_carryover_rules_confirmed: true,
      },
    ],
  });
  assertEquals(
    result.finalizations?.[0]?.fields.line_12_noncash_contributions,
    5_000,
  );
  assertEquals(
    result.finalizations?.[0]?.fields.line_13_contribution_carryover,
    5_000,
  );
  assertEquals(
    result.carryforwards?.["charitable_capital_gain_2023_older-land"],
    0,
  );
  assertEquals(
    result.carryforwards?.["charitable_capital_gain_2024_newer-land"],
    5_000,
  );
});

Deno.test("scheduleA.compute: elected carryover rejects mixed 30% current gifts pending full limit ordering", () => {
  assertThrows(
    () =>
      compute({
        agi: 30_000,
        capital_gain_50_percent_election_confirmed: true,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        noncash_contribution_items: [{
          source: "ordinary property for use of charity",
          contribution_id: "other-gift",
          amount: 1_000,
          category: "other_30",
          is_capital_gain_property: false,
        }],
        capital_gain_property_carryovers: [{
          contribution_id: "old-land",
          contribution_year: 2024,
          original_category: "capital_gain_30",
          original_fmv: 10_000,
          adjusted_basis: 8_000,
          previously_deducted: 2_000,
          ordinary_carryover_rules_confirmed: true,
        }],
      }),
    Error,
    "full carryover-limit reconciliation",
  );
});

Deno.test("scheduleA.inputSchema: negative numeric field rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: non-boolean force_itemized rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: "yes" });
  assertEquals(parsed.success, false);
});

Deno.test("scheduleA.inputSchema: string where number expected is rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: "5000" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. MEDICAL EXPENSES — 7.5% AGI floor
// =============================================================================

Deno.test("scheduleA.compute: medical deduction = expenses minus 7.5% AGI floor", () => {
  // 10000 - (80000 × 7.5%) = 10000 - 6000 = 4000
  const result = compute({ line_1_medical: 10_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 4_000);
});

Deno.test("scheduleA.compute: medical expenses exactly at 7.5% AGI floor = zero deduction", () => {
  // 6000 = 80000 × 0.075 → deductible = max(0, 0) = 0
  const result = compute({ line_1_medical: 6_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical expenses $1 above 7.5% AGI floor yields $1 deduction", () => {
  // 6001 - 6000 = 1
  const result = compute({ line_1_medical: 6_001, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 1);
});

Deno.test("scheduleA.compute: medical expenses below 7.5% AGI floor floors at zero, never negative", () => {
  // 3000 < 6000 → deductible = max(0, 3000 - 6000) = 0
  const result = compute({ line_1_medical: 3_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

Deno.test("scheduleA.compute: medical deduction with zero AGI equals full medical amount", () => {
  // floor = 0 × 7.5% = 0 → deductible = 5000
  const result = compute({ line_1_medical: 5_000, agi: 0 });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

Deno.test("scheduleA.compute: negative AGI cannot make the medical deduction exceed expenses", () => {
  const result = compute({ line_1_medical: 5_000, agi: -1_000 });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

// =============================================================================
// 3. SALT CAP — $40,000 (OBBBA §70002, TY2025)
// =============================================================================

Deno.test("scheduleA.compute: SALT below $40,000 cap passes through unchanged", () => {
  const result = compute({ line_5a_state_income_tax: 9_999 });
  assertEquals(deductionInput(result).itemized_deductions, 9_999);
});

Deno.test("scheduleA.compute: SALT exactly $40,000 passes through unchanged", () => {
  const result = compute({ line_5a_state_income_tax: 40_000 });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT $40,001 is capped at $40,000", () => {
  const result = compute({ line_5a_state_income_tax: 40_001 });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT three components aggregate then cap — 5a+5b+5c well above cap", () => {
  // 20000 + 15000 + 10000 = 45000 → capped at 40000
  const result = compute({
    line_5a_state_income_tax: 20_000,
    line_5b_real_estate_tax: 15_000,
    line_5c_personal_property_tax: 10_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT three components sum to exactly $40,000 passes through", () => {
  // 20000 + 12000 + 8000 = 40000 = cap
  const result = compute({
    line_5a_state_income_tax: 20_000,
    line_5b_real_estate_tax: 12_000,
    line_5c_personal_property_tax: 8_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

Deno.test("scheduleA.compute: SALT aggregates 5a + 5b + 5c before applying cap (below cap)", () => {
  // 3000 + 2000 + 1000 = 6000 < 40000 cap
  const result = compute({
    line_5a_state_income_tax: 3_000,
    line_5b_real_estate_tax: 2_000,
    line_5c_personal_property_tax: 1_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 6_000);
});

// =============================================================================
// 4. AMT ADDBACK SOURCE — standard_deduction resolves line 2a
// =============================================================================

Deno.test("scheduleA.compute: SALT alone routes capped taxes to deduction decision", () => {
  // 8000 < 10000 cap → passes through uncapped
  const result = compute({ line_5a_state_income_tax: 8_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 8_000);
});

Deno.test("scheduleA.compute: capped SALT reaches deduction decision", () => {
  // 5a = 42000 → capped at 40000
  const result = compute({ line_5a_state_income_tax: 42_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 40_000);
});

Deno.test("scheduleA.compute: taxesTotal (SALT + line_6) reaches deduction decision", () => {
  // SALT: 25000 + 20000 = 45000, capped at 40000; line6: 3000 → taxesTotal = 43000
  const result = compute({
    line_5a_state_income_tax: 25_000,
    line_5b_real_estate_tax: 20_000,
    line_6_other_taxes: 3_000,
  });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 43_000);
});

Deno.test("scheduleA.compute: line_6_other_taxes reaches deduction decision", () => {
  const result = compute({ line_6_other_taxes: 8_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 8_000);
});

Deno.test("scheduleA.compute: zero taxes route as zero", () => {
  const result = compute({
    cash_contributions_to_50_percent_organizations: 500,
    agi: 10_000,
  });
  assertEquals(
    findOutput(result, "standard_deduction")?.fields.itemized_taxes,
    0,
  );
});

// =============================================================================
// 5. MORTGAGE INTEREST — passthrough
// =============================================================================

Deno.test("scheduleA.compute: mortgage interest from 1098 routes to f1040 line12e", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 18_000 });
  assertEquals(deductionInput(result).itemized_deductions, 18_000);
});

Deno.test("scheduleA.compute: interest aggregates all four interest lines", () => {
  // 12000 + 3000 + 800 + 2200 = 18000
  const result = compute({
    line_8a_mortgage_interest_1098: 12_000,
    line_8b_mortgage_interest_no_1098: 3_000,
    line_8c_points_no_1098: 800,
    line_9_investment_interest: 2_200,
  });
  assertEquals(deductionInput(result).itemized_deductions, 18_000);
});

Deno.test("scheduleA.compute: Form 8396 line 3 reduces deductible mortgage interest", () => {
  const result = compute({
    line_8a_mortgage_interest_1098: 15_000,
    form8396_interest_credit_reduction: 2_000,
    form8396_interest_reporting_line: "8a",
  });
  assertEquals(deductionInput(result).itemized_deductions, 13_000);
});

// =============================================================================
// 6. CHARITABLE CONTRIBUTIONS — Pub. 526 Worksheet 2
// =============================================================================

Deno.test("scheduleA.compute: cash contributions below 60% AGI cap pass through unchanged", () => {
  // 5000 < 60% × 100000 = 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 5_000,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

Deno.test("scheduleA.compute: cash contributions exactly at 60% AGI cap pass through unchanged", () => {
  // 60% × 100000 = 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 60_000,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 60_000);
});

Deno.test("scheduleA.compute: cash contributions $1 above 60% AGI cap are capped at 60% AGI", () => {
  // 60001 > 60000 → capped at 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 60_001,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 60_000);
  assertEquals(result.carryforwards?.charitable_cash_60_2025, 1);
});

Deno.test("scheduleA.compute: cash and 50% noncash route to separate filed lines", () => {
  const result = compute({
    cash_contributions_to_50_percent_organizations: 20_000,
    noncash_contribution_items: [{
      source: "Form 8283 item 1",
      amount: 10_000,
      category: "noncash_50",
    }],
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 30_000);
  assertEquals(
    result.finalizations?.[0].fields.line_11_cash_contributions,
    20_000,
  );
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    10_000,
  );
});

Deno.test("scheduleA.compute: 50% noncash room subtracts deductible cash", () => {
  const result = compute({
    cash_contributions_to_50_percent_organizations: 40_000,
    noncash_contribution_items: [{
      source: "Form 8283 item 1",
      amount: 15_000,
      category: "noncash_50",
    }],
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 50_000);
  assertEquals(result.carryforwards?.charitable_noncash_50_2025, 5_000);
});

Deno.test("scheduleA.inputSchema: unclassified filed amounts and prior carryover are rejected", () => {
  for (
    const field of [
      "line_11_cash_contributions",
      "line_12_noncash_contributions",
      "line_13_contribution_carryover",
    ]
  ) {
    assertEquals(
      scheduleA.inputSchema.safeParse({ [field]: 1 }).success,
      false,
    );
  }
});

Deno.test("scheduleA.compute: classified contributions require AGI and zero AGI yields carryforward", () => {
  const input = { cash_contributions_to_50_percent_organizations: 5_000 };
  let threw = false;
  try {
    compute(input);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  const result = compute({ ...input, agi: 0 });
  assertEquals(deductionInput(result).itemized_deductions, 0);
  assertEquals(result.carryforwards?.charitable_cash_60_2025, 5_000);
});

Deno.test("scheduleA.compute: Pub. 526 20% category obeys nested 50%, 30%, and 20% ceilings", () => {
  const result = compute({
    agi: 100_000,
    cash_contributions_to_50_percent_organizations: 10_000,
    noncash_contribution_items: [
      { source: "50% ordinary", category: "noncash_50", amount: 10_000 },
      { source: "other 30%", category: "other_30", amount: 10_000 },
      { source: "capital 30%", category: "capital_gain_30", amount: 10_000 },
      { source: "capital 20%", category: "capital_gain_20", amount: 20_000 },
    ],
  });
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    40_000,
  );
  assertEquals(deductionInput(result).itemized_deductions, 50_000);
  assertEquals(
    result.carryforwards?.charitable_capital_gain_20_2025,
    10_000,
  );
});

Deno.test("scheduleA.compute: Pub. 526 cash to a second-category charity uses the other 30% limit", () => {
  // Publication 526 example: $15,000 capital-gain property to a 50% charity
  // and $10,000 cash to a second-category organization, AGI $50,000.
  const result = compute({
    agi: 50_000,
    cash_contributions_other_30: 10_000,
    noncash_contribution_items: [{
      source: "capital-gain property",
      amount: 15_000,
      category: "capital_gain_30",
    }],
  });
  assertEquals(
    result.finalizations?.[0].fields.line_11_cash_contributions,
    10_000,
  );
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    15_000,
  );
  assertEquals(deductionInput(result).itemized_deductions, 25_000);
});

Deno.test("scheduleA.compute: cash-only other 30% excess retains its own vintage", () => {
  const result = compute({ agi: 50_000, cash_contributions_other_30: 20_000 });
  assertEquals(
    result.finalizations?.[0].fields.line_11_cash_contributions,
    15_000,
  );
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    0,
  );
  assertEquals(result.carryforwards?.charitable_cash_other_30_2025, 5_000);
});

Deno.test("scheduleA.compute: fully allowed mixed other 30% gifts split exactly across filed lines", () => {
  const result = compute({
    agi: 100_000,
    cash_contributions_other_30: 5_000,
    noncash_contribution_items: [{
      source: "property",
      amount: 5_000,
      category: "other_30",
    }],
  });
  assertEquals(
    result.finalizations?.[0].fields.line_11_cash_contributions,
    5_000,
  );
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    5_000,
  );
});

Deno.test("scheduleA.compute: partly limited mixed other 30% gifts reject an invented cash/property split", () => {
  assertThrows(
    () =>
      compute({
        agi: 100_000,
        cash_contributions_other_30: 25_000,
        noncash_contribution_items: [{
          source: "property",
          amount: 10_000,
          category: "other_30",
        }],
      }),
    Error,
    "need an explicit Schedule A line-11/line-12 allocation",
  );
});

Deno.test("scheduleA.compute: zero AGI leaves both mixed other-30 sources entirely undeducted", () => {
  const result = compute({
    agi: 0,
    cash_contributions_other_30: 2_000,
    noncash_contribution_items: [{
      source: "property",
      amount: 3_000,
      category: "other_30",
    }],
  });
  assertEquals(result.finalizations?.[0].fields.line_11_cash_contributions, 0);
  assertEquals(
    result.finalizations?.[0].fields.line_12_noncash_contributions,
    0,
  );
  assertEquals(result.carryforwards?.charitable_cash_other_30_2025, 2_000);
  assertEquals(result.carryforwards?.charitable_noncash_other_30_2025, 3_000);
});

// =============================================================================
// 7. TOTAL ITEMIZED DEDUCTIONS — routes to f1040 line12e
// =============================================================================

Deno.test("scheduleA.compute: all-zero inputs produce zero total itemized deduction", () => {
  const result = compute({});
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

Deno.test("scheduleA.compute: total itemized = medical + taxes + interest + contributions + casualty + other", () => {
  // medical: 10000 - (80000×7.5%) = 10000 - 6000 = 4000
  // SALT: 4000 + 4000 = 8000 (under $40,000 cap); line6: 2000 → taxesTotal = 10000
  // interest: 15000
  // contributions: 3000 (under 60% of 80000=48000)
  // casualty: 2000; other: 500
  // total = 4000 + 10000 + 15000 + 3000 + 2000 + 500 = 34500
  const result = compute({
    line_1_medical: 10_000,
    agi: 80_000,
    line_5a_state_income_tax: 4_000,
    line_5b_real_estate_tax: 4_000,
    line_6_other_taxes: 2_000,
    line_8a_mortgage_interest_1098: 15_000,
    cash_contributions_to_50_percent_organizations: 3_000,
    line_15_casualty_theft_loss: 2_000,
    line_16_other_deductions: 500,
  });
  assertEquals(deductionInput(result).itemized_deductions, 34_500);
});

Deno.test("scheduleA.compute: casualty loss enters total directly without re-applying floors", () => {
  // Form 4684 already applied $100/event and 10% AGI reductions
  const result = compute({ line_15_casualty_theft_loss: 4_200 });
  assertEquals(deductionInput(result).itemized_deductions, 4_200);
});

Deno.test("scheduleA.compute: other deductions enter total directly", () => {
  const result = compute({ line_16_other_deductions: 3_500 });
  assertEquals(deductionInput(result).itemized_deductions, 3_500);
});

Deno.test("scheduleA.compute: result always provides the itemized total for the deduction decision", () => {
  const result = compute({});
  const deductionOut = findOutput(result, "standard_deduction");
  assertEquals(deductionOut !== undefined, true);
  assertEquals(
    (deductionOut!.fields as Record<string, number>).itemized_deductions,
    0,
  );
});

Deno.test("scheduleA.compute: result always routes to standard_deduction for comparison", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 20_000 });
  const sdOut = findOutput(result, "standard_deduction");
  assertEquals(sdOut !== undefined, true);
  assertEquals(
    (sdOut!.fields as Record<string, number>).itemized_deductions,
    20_000,
  );
});

// =============================================================================
// 8. FORCE FLAGS — routing hints, must not change deduction totals
// =============================================================================

Deno.test("scheduleA.compute: force_itemized does not change deduction total", () => {
  const withFlag = compute({
    force_itemized: true,
    line_8a_mortgage_interest_1098: 20_000,
  });
  const withoutFlag = compute({ line_8a_mortgage_interest_1098: 20_000 });
  assertEquals(
    deductionInput(withFlag).itemized_deductions,
    deductionInput(withoutFlag).itemized_deductions,
  );
});

Deno.test("scheduleA.compute: force_standard does not change the Schedule A total", () => {
  const result = compute({ force_standard: true });
  const deductionOut = findOutput(result, "standard_deduction");
  assertEquals(deductionOut !== undefined, true);
  assertEquals(
    (deductionOut!.fields as Record<string, number>).itemized_deductions,
    0,
  );
});

// =============================================================================
// 9. SMOKE TEST
// =============================================================================

Deno.test("scheduleA.compute: smoke — all major boxes populate total and AMT tax source", () => {
  // Medical: 15000 - (120000 × 7.5%) = 15000 - 9000 = 6000
  // SALT: 4000 + 3000 + 2000 = 9000 (under $40,000 cap)
  // line_6: 2500 → taxesTotal = 9000 + 2500 = 11500
  // Interest: 18000 + 1000 + 3000 = 22000
  // Contributions: 10000 cash + 5000 ordinary noncash + 2000 capital gain = 17000
  // Casualty: 4000; Other: 750
  // Total = 6000 + 11500 + 22000 + 17000 + 4000 + 750 = 61250
  const result = compute({
    line_1_medical: 15_000,
    agi: 120_000,
    line_5a_state_income_tax: 4_000,
    line_5b_real_estate_tax: 3_000,
    line_5c_personal_property_tax: 2_000,
    line_6_other_taxes: 2_500,
    line_8a_mortgage_interest_1098: 18_000,
    line_8c_points_no_1098: 1_000,
    line_9_investment_interest: 3_000,
    cash_contributions_to_50_percent_organizations: 10_000,
    noncash_contribution_items: [
      { source: "equipment", amount: 5_000, category: "noncash_50" },
      {
        source: "long-term property",
        amount: 2_000,
        category: "capital_gain_30",
      },
    ],
    line_15_casualty_theft_loss: 4_000,
    line_16_other_deductions: 750,
  });

  assertEquals(deductionInput(result).itemized_deductions, 61_250);

  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 11_500);

  assertEquals(result.outputs.length, 1);
});

// ── MFS SALT cap ─────────────────────────────────────────────────────────────

Deno.test("MFS SALT cap: $8,000 SALT passes through for MFS filer (below $20,000 MFS cap)", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_state_income_tax: 4_000,
    line_5b_real_estate_tax: 4_000, // total SALT = $8,000 < $20,000 MFS cap
  });
  assertEquals(deductionInput(result).itemized_deductions, 8_000);
});

Deno.test("MFS SALT cap: $22,000 SALT capped at $20,000 for MFS (half of $40,000)", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_state_income_tax: 22_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 20_000);
});

Deno.test("Non-MFS SALT cap: $8,000 SALT passes through for Single filer (below $10,000 cap)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_state_income_tax: 8_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 8_000);
});

Deno.test("No filing_status: SALT uses $40,000 cap (OBBBA §70002, non-MFS default)", () => {
  const result = compute({ line_5a_state_income_tax: 15_000 });
  assertEquals(deductionInput(result).itemized_deductions, 15_000);
});
