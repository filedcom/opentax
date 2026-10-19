import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  CharitableCarryoverCategory,
  inputSchema,
  scheduleA,
} from "./index.ts";
import { FilingStatus } from "../../../../types.ts";

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

test("scheduleA.inputSchema: empty object is valid — all fields optional", () => {
  const parsed = scheduleA.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

test("scheduleA.compute: Pub. 526 capital-gain election refigures older property carryover", () => {
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

test("scheduleA.inputSchema: elected current gifts need complete item classification and an explicit prior ledger", () => {
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

test("scheduleA.compute: no-appreciation capital property still participates in a return-wide 50% election", () => {
  const result = compute({
    agi: 20_000,
    capital_gain_50_percent_election_confirmed: true,
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

test("scheduleA.compute: fifth-year elected carryover expires after its last eligible deduction year", () => {
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

test("scheduleA.compute: elected capital-gain carryovers use oldest property first", () => {
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

test("scheduleA.compute: elected carryover rejects mixed 30% current gifts pending full limit ordering", () => {
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

test("scheduleA.inputSchema: negative numeric field rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: -1 });
  assertEquals(parsed.success, false);
});

test("scheduleA.inputSchema: non-boolean force_itemized rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ force_itemized: "yes" });
  assertEquals(parsed.success, false);
});

test("Schedule A rejects contradictory deduction choices", () => {
  assertEquals(
    scheduleA.inputSchema.safeParse({
      force_itemized: true,
      force_standard: true,
    }).success,
    false,
  );
});

test("Schedule A mortgage-use warning requires reviewed loan and interest facts", () => {
  const review = {
    loan_document_reference: "2025 home equity loan statement",
    outstanding_balance_2025: 100_000,
    nonqualifying_proceeds_amount: 10_000,
    interest_allocation_workpaper_reference: "Pub 936 tracing workpaper",
    deductible_home_interest_reviewed: true,
  };
  assertEquals(
    inputSchema.safeParse({
      line_8a_mortgage_interest_1098: 2_000,
      home_mortgage_nonqualifying_use_review: review,
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      home_mortgage_nonqualifying_use_review: review,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      line_8a_mortgage_interest_1098: 2_000,
      home_mortgage_nonqualifying_use_review: {
        ...review,
        interest_allocation_workpaper_reference: "",
      },
    }).success,
    false,
  );
});

test("Schedule A line 6 tax types require distinct reviewed rows totaling the filed amount", () => {
  const item = {
    type: "foreign_income_tax",
    amount: 500,
    source_document_reference: "foreign tax receipt",
    deductible_tax_reviewed: true,
  };
  assertEquals(
    inputSchema.safeParse({
      line_6_other_taxes: 500,
      line_6_other_tax_items: [item],
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      line_6_other_taxes: 501,
      line_6_other_tax_items: [item],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      line_6_other_taxes: 1_000,
      line_6_other_tax_items: [item, item],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      line_6_other_taxes: 500,
      line_6_other_tax_items: [{ ...item, source_document_reference: "" }],
    }).success,
    false,
  );
});

test("Schedule A seller-financed line 8b needs exact interest and recipient evidence", () => {
  const seller = {
    amount: 2_000,
    seller_name: "Seller Example",
    tin_type: "ssn",
    seller_tin: "222334444",
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
    mortgage_contract_reference: "2025 mortgage contract",
    interest_payment_workpaper_reference: "2025 interest ledger",
    seller_received_taxpayer_tin_confirmed: true,
  };
  assertEquals(
    inputSchema.safeParse({
      line_8b_mortgage_interest_no_1098: 2_000,
      line_8b_seller_financed: seller,
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      line_8b_mortgage_interest_no_1098: 2_001,
      line_8b_seller_financed: seller,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      line_8b_mortgage_interest_no_1098: 2_000,
      line_8b_seller_financed: { ...seller, seller_tin: "" },
    }).success,
    false,
  );
});

test("scheduleA.inputSchema: string where number expected is rejected", () => {
  const parsed = scheduleA.inputSchema.safeParse({ line_1_medical: "5000" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. MEDICAL EXPENSES — 7.5% AGI floor
// =============================================================================

test("scheduleA.compute: medical deduction = expenses minus 7.5% AGI floor", () => {
  // 10000 - (80000 × 7.5%) = 10000 - 6000 = 4000
  const result = compute({ line_1_medical: 10_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 4_000);
});

test("scheduleA.compute: medical expenses exactly at 7.5% AGI floor = zero deduction", () => {
  // 6000 = 80000 × 0.075 → deductible = max(0, 0) = 0
  const result = compute({ line_1_medical: 6_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

test("scheduleA.compute: medical expenses $1 above 7.5% AGI floor yields $1 deduction", () => {
  // 6001 - 6000 = 1
  const result = compute({ line_1_medical: 6_001, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 1);
});

test("scheduleA.compute: medical expenses below 7.5% AGI floor floors at zero, never negative", () => {
  // 3000 < 6000 → deductible = max(0, 3000 - 6000) = 0
  const result = compute({ line_1_medical: 3_000, agi: 80_000 });
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

test("scheduleA.compute: medical deduction with zero AGI equals full medical amount", () => {
  // floor = 0 × 7.5% = 0 → deductible = 5000
  const result = compute({ line_1_medical: 5_000, agi: 0 });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

test("scheduleA.compute: negative AGI cannot make the medical deduction exceed expenses", () => {
  const result = compute({ line_1_medical: 5_000, agi: -1_000 });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

// =============================================================================
// 3. SALT CAP — $40,000 (OBBBA §70002, TY2025)
// =============================================================================

test("scheduleA.compute: SALT below $40,000 cap passes through unchanged", () => {
  const result = compute({ line_5a_state_income_tax: 9_999 });
  assertEquals(deductionInput(result).itemized_deductions, 9_999);
});

test("scheduleA.compute: SALT exactly $40,000 passes through unchanged", () => {
  const result = compute({ line_5a_state_income_tax: 40_000 });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

test("scheduleA.compute: SALT $40,001 is capped at $40,000", () => {
  const result = compute({ line_5a_state_income_tax: 40_001 });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

test("scheduleA.compute: SALT three components aggregate then cap — 5a+5b+5c well above cap", () => {
  // 20000 + 15000 + 10000 = 45000 → capped at 40000
  const result = compute({
    line_5a_state_income_tax: 20_000,
    line_5b_real_estate_tax: 15_000,
    line_5c_personal_property_tax: 10_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

test("scheduleA.compute: SALT three components sum to exactly $40,000 passes through", () => {
  // 20000 + 12000 + 8000 = 40000 = cap
  const result = compute({
    line_5a_state_income_tax: 20_000,
    line_5b_real_estate_tax: 12_000,
    line_5c_personal_property_tax: 8_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 40_000);
});

test("scheduleA.compute: SALT aggregates 5a + 5b + 5c before applying cap (below cap)", () => {
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

test("scheduleA.compute: SALT alone routes capped taxes to deduction decision", () => {
  // 8000 < 10000 cap → passes through uncapped
  const result = compute({ line_5a_state_income_tax: 8_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 8_000);
});

test("scheduleA.compute: capped SALT reaches deduction decision", () => {
  // 5a = 42000 → capped at 40000
  const result = compute({ line_5a_state_income_tax: 42_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 40_000);
});

test("scheduleA.compute: taxesTotal (SALT + line_6) reaches deduction decision", () => {
  // SALT: 25000 + 20000 = 45000, capped at 40000; line6: 3000 → taxesTotal = 43000
  const result = compute({
    line_5a_state_income_tax: 25_000,
    line_5b_real_estate_tax: 20_000,
    line_6_other_taxes: 3_000,
  });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 43_000);
});

test("scheduleA.compute: line_6_other_taxes reaches deduction decision", () => {
  const result = compute({ line_6_other_taxes: 8_000 });
  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 8_000);
});

test("scheduleA.compute: zero taxes route as zero", () => {
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

test("scheduleA.compute: mortgage interest from 1098 routes to f1040 line12e", () => {
  const result = compute({ line_8a_mortgage_interest_1098: 18_000 });
  assertEquals(deductionInput(result).itemized_deductions, 18_000);
});

test("scheduleA.compute: interest aggregates all four interest lines", () => {
  // 12000 + 3000 + 800 + 2200 = 18000
  const result = compute({
    line_8a_mortgage_interest_1098: 12_000,
    line_8b_mortgage_interest_no_1098: 3_000,
    line_8c_points_no_1098: 800,
    line_9_investment_interest: 2_200,
  });
  assertEquals(deductionInput(result).itemized_deductions, 18_000);
});

test("scheduleA.compute: Form 8396 line 3 reduces deductible mortgage interest", () => {
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

test("scheduleA.compute: cash contributions below 60% AGI cap pass through unchanged", () => {
  // 5000 < 60% × 100000 = 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 5_000,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 5_000);
});

test("scheduleA.compute: cash contributions exactly at 60% AGI cap pass through unchanged", () => {
  // 60% × 100000 = 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 60_000,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 60_000);
});

test("scheduleA.compute: cash contributions $1 above 60% AGI cap are capped at 60% AGI", () => {
  // 60001 > 60000 → capped at 60000
  const result = compute({
    cash_contributions_to_50_percent_organizations: 60_001,
    agi: 100_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 60_000);
  assertEquals(result.carryforwards?.charitable_cash_60_2025, 1);
});

test("scheduleA.compute: cash and 50% noncash route to separate filed lines", () => {
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

test("scheduleA.compute: 50% noncash room subtracts deductible cash", () => {
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

test("scheduleA.inputSchema: unclassified filed amounts and prior carryover are rejected", () => {
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

test("scheduleA.compute: classified contributions require AGI and zero AGI yields carryforward", () => {
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

test("scheduleA.compute: Pub. 526 20% category obeys nested 50%, 30%, and 20% ceilings", () => {
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

test("scheduleA.compute: Pub. 526 cash to a second-category charity uses the other 30% limit", () => {
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

test("scheduleA.compute: cash-only other 30% excess retains its own vintage", () => {
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

test("scheduleA.compute: fully allowed mixed other 30% gifts split exactly across filed lines", () => {
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

test("scheduleA.compute: partly limited mixed other 30% gifts reject an invented cash/property split", () => {
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

test("scheduleA.compute: zero AGI leaves both mixed other-30 sources entirely undeducted", () => {
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

test("scheduleA.compute: all-zero inputs produce zero total itemized deduction", () => {
  const result = compute({});
  assertEquals(deductionInput(result).itemized_deductions, 0);
});

test("scheduleA.compute: total itemized = medical + taxes + interest + contributions + casualty + other", () => {
  // medical: 10000 - (80000×7.5%) = 10000 - 6000 = 4000
  // SALT: 4000 + 4000 = 8000 (under $40,000 cap); line6: 2000 → taxesTotal = 10000
  // interest: 15000
  // contributions: 3000 (under 60% of 80000=48000)
  // casualty: Form 4684 line 16 10000 less 10% of AGI 8000 = 2000; other: 500
  // total = 4000 + 10000 + 15000 + 3000 + 2000 + 500 = 34500
  const result = compute({
    line_1_medical: 10_000,
    agi: 80_000,
    line_5a_state_income_tax: 4_000,
    line_5b_real_estate_tax: 4_000,
    line_6_other_taxes: 2_000,
    line_8a_mortgage_interest_1098: 15_000,
    cash_contributions_to_50_percent_organizations: 3_000,
    form4684_line16_loss: 10_000,
    line_16_other_deductions: 500,
  });
  assertEquals(deductionInput(result).itemized_deductions, 34_500);
});

// 2025 Form 4684 lines 17 and 18: line 16 less 10% of Form 1040 line 11b is
// Schedule A line 15.
test("scheduleA.compute: line 15 is Form 4684 line 16 less 10% of AGI", () => {
  const result = compute({ agi: 50_000, form4684_line16_loss: 9_200 });
  assertEquals(deductionInput(result).itemized_deductions, 4_200);
  assertEquals(
    result.finalizations?.[0]?.fields.line_15_casualty_theft_loss,
    4_200,
  );
  assertEquals(
    compute({ agi: 50_000, form4684_line16_loss: 4_000 }).finalizations?.[0]
      ?.fields.line_15_casualty_theft_loss,
    0,
  );
});

test("scheduleA.compute: line 15 is not entered directly", () => {
  assertThrows(
    () => compute({ line_15_casualty_theft_loss: 4_200 }),
    Error,
    "Form 4684 line 18",
  );
});

// A net qualified disaster loss (Form 4684 line 15) is Schedule A line 16
// when itemizing (2025 Instructions for Form 4684, Line 15).
test("scheduleA.compute: a net qualified disaster loss joins the itemized total", () => {
  const result = compute({
    agi: 50_000,
    line_16_other_deductions: 500,
    net_qualified_disaster_loss: 2_500,
  });
  assertEquals(deductionInput(result).itemized_deductions, 3_000);
});

test("scheduleA.compute: other deductions enter total directly", () => {
  const result = compute({ line_16_other_deductions: 3_500 });
  assertEquals(deductionInput(result).itemized_deductions, 3_500);
});

test("scheduleA.compute: result always provides the itemized total for the deduction decision", () => {
  const result = compute({});
  const deductionOut = findOutput(result, "standard_deduction");
  assertEquals(deductionOut !== undefined, true);
  assertEquals(
    (deductionOut!.fields as Record<string, number>).itemized_deductions,
    0,
  );
});

test("scheduleA.compute: result always routes to standard_deduction for comparison", () => {
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

test("scheduleA.compute: force_itemized does not change deduction total", () => {
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

test("scheduleA.compute: force_standard does not change the Schedule A total", () => {
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

test("scheduleA.compute: smoke — all major boxes populate total and AMT tax source", () => {
  // Medical: 15000 - (120000 × 7.5%) = 15000 - 9000 = 6000
  // SALT: 4000 + 3000 + 2000 = 9000 (under $40,000 cap)
  // line_6: 2500 → taxesTotal = 9000 + 2500 = 11500
  // Interest: 18000 + 1000 + 3000 = 22000
  // Contributions: 10000 cash + 5000 ordinary noncash + 2000 capital gain = 17000
  // Casualty: Form 4684 line 16 16000 less 10% of AGI 12000 = 4000; Other: 750
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
    form4684_line16_loss: 16_000,
    line_16_other_deductions: 750,
  });

  assertEquals(deductionInput(result).itemized_deductions, 61_250);

  const deduction = findOutput(result, "standard_deduction");
  assertEquals(deduction?.fields.itemized_taxes, 11_500);

  assertEquals(result.outputs.length, 2);
  assertEquals(
    findOutput(result, "form8995")?.fields.itemized_deductions,
    61_250,
  );
});

// ── MFS SALT cap ─────────────────────────────────────────────────────────────

test("MFS SALT cap: $8,000 SALT passes through for MFS filer (below $20,000 MFS cap)", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_state_income_tax: 4_000,
    line_5b_real_estate_tax: 4_000, // total SALT = $8,000 < $20,000 MFS cap
  });
  assertEquals(deductionInput(result).itemized_deductions, 8_000);
});

test("MFS SALT cap: $22,000 SALT capped at $20,000 for MFS (half of $40,000)", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    line_5a_state_income_tax: 22_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 20_000);
});

test("Non-MFS SALT cap: $8,000 SALT passes through for Single filer (below $10,000 cap)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line_5a_state_income_tax: 8_000,
  });
  assertEquals(deductionInput(result).itemized_deductions, 8_000);
});

test("No filing_status: SALT uses $40,000 cap (OBBBA §70002, non-MFS default)", () => {
  const result = compute({ line_5a_state_income_tax: 15_000 });
  assertEquals(deductionInput(result).itemized_deductions, 15_000);
});

test("Schedule A adds rounded line amounts rather than rounding their combined cents", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    agi: 295230.09,
    line_8a_mortgage_interest_1098: 35915.15,
    line_5b_real_estate_tax: 20284.44,
  });
  assertEquals(deductionInput(result).itemized_deductions, 56199);
  assertEquals(deductionInput(result).itemized_taxes, 20284);
});

test("Schedule A combines sources on line 5a before rounding", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50000,
    line_5a_state_income_tax: 100.40,
    retirement_state_local_withholding: 100.40,
  });
  assertEquals(deductionInput(result).itemized_deductions, 201);
});

test("scheduleA.inputSchema: line 11 qualified contributions stay within sourced cash gifts", () => {
  assertEquals(
    inputSchema.safeParse({
      cash_contributions_to_50_percent_organizations: 250,
      line_11_qualified_contributions: 200,
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      cash_contributions_to_50_percent_organizations: 150,
      line_11_qualified_contributions: 200,
    }).success,
    false,
  );
});

// =============================================================================
// TY2026 (P.L. 119-21)
// =============================================================================

function compute2026(input: ScheduleAInput) {
  return scheduleA.compute({ taxYear: 2026, formType: "f1040" }, input);
}

test("TY2026 SALT cap is $40,400 less 30% of MAGI over $505,000 (IRC §164(b)(7))", () => {
  const result = compute2026({
    filing_status: FilingStatus.Single,
    agi: 600_000,
    line_5a_state_income_tax: 30_000,
    line_5b_real_estate_tax: 20_000,
  });
  // $40,400 - 0.30 x $95,000 = $11,900.
  assertEquals(deductionInput(result).itemized_taxes, 11_900);
});

test("TY2026 MFS SALT cap is $20,200 and never below $5,000 (IRC §164(b)(7))", () => {
  const under = compute2026({
    filing_status: FilingStatus.MFS,
    agi: 100_000,
    line_5a_state_income_tax: 30_000,
  });
  assertEquals(deductionInput(under).itemized_taxes, 20_200);
  const floored = compute2026({
    filing_status: FilingStatus.MFS,
    agi: 400_000,
    line_5a_state_income_tax: 30_000,
  });
  assertEquals(deductionInput(floored).itemized_taxes, 5_000);
});

test("TY2026 line 8d phases out 10% per $1,000 of AGI over $100,000 (IRC §163(h)(3)(E)(ii))", () => {
  const base = {
    filing_status: FilingStatus.Single,
    line_8d_mortgage_insurance_premiums: 1_200,
    mortgage_insurance_premiums_qualified_confirmed: true as const,
  };
  // $4,400 over is five steps or fractions: half of $1,200.
  const partial = compute2026({ ...base, agi: 104_400 });
  assertEquals(deductionInput(partial).itemized_deductions, 600);
  assertEquals(
    partial.finalizations?.[0].fields.line_8d_mortgage_insurance_allowed,
    600,
  );
  const full = compute2026({ ...base, agi: 100_000 });
  assertEquals(deductionInput(full).itemized_deductions, 1_200);
  // SA-F1040-011-03: nothing remains above $109,000.
  const none = compute2026({ ...base, agi: 109_001 });
  assertEquals(deductionInput(none).itemized_deductions, 0);
});

test("TY2025 refuses mortgage insurance premiums (IRC §163(h)(3)(E)(iv))", () => {
  assertThrows(
    () =>
      compute({
        agi: 50_000,
        line_8d_mortgage_insurance_premiums: 500,
        mortgage_insurance_premiums_qualified_confirmed: true,
      }),
    Error,
    "not deductible",
  );
});

test("TY2026 charity above 0.5% of AGI is deductible (IRC §170(b)(1)(I))", () => {
  const result = compute2026({
    filing_status: FilingStatus.Single,
    agi: 104_400,
    cash_contributions_to_50_percent_organizations: 3_000,
    cash_contributions_to_daf_or_supporting_organizations: 500,
  });
  // $3,000 - 0.005 x $104,400.
  assertEquals(deductionInput(result).itemized_deductions, 2_478);
  assertEquals(result.finalizations?.[0].fields.charitable_agi_floor, 522);
  assertEquals(deductionInput(result).nonitemizer_charitable_cash, 2_500);
});

test("TY2026 refuses the charity floor when AGI limits or carryovers apply", () => {
  assertThrows(
    () =>
      compute2026({
        filing_status: FilingStatus.Single,
        agi: 10_000,
        cash_contributions_to_50_percent_organizations: 8_000,
      }),
    Error,
    "limitation worksheet",
  );
});

test("TY2026 marks 50%-organization cash without a donor-advised fund split", () => {
  const result = compute2026({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    cash_contributions_to_50_percent_organizations: 300,
  });
  assertEquals(
    findOutput(result, "standard_deduction")?.fields
      .nonitemizer_charitable_cash_unclassified,
    true,
  );
});

test("TY2026 refuses an uncategorized line 17 amount", () => {
  assertThrows(
    () =>
      compute2026({
        filing_status: FilingStatus.Single,
        agi: 50_000,
        line_16_other_deductions: 1_000,
      }),
    Error,
    "gambling",
  );
});

test("TY2025 Schedule A does not send the non-itemizer charity source", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    agi: 50_000,
    cash_contributions_to_50_percent_organizations: 300,
  });
  const fields = findOutput(result, "standard_deduction")!.fields;
  assertEquals("nonitemizer_charitable_cash" in fields, false);
  assertEquals("nonitemizer_charitable_cash_unclassified" in fields, false);
  assertEquals(deductionInput(result).itemized_deductions, 300);
});

// Pub. 526 (2025), Carryovers: a carryover keeps its contribution-year limit
// category and is deducted after this year's gifts in that category.
function priorCarryover(
  category: CharitableCarryoverCategory,
  amount: number,
  contribution_year = 2024,
) {
  return {
    contribution_year,
    category,
    amount,
    source_document_reference: "2024 return carryover worksheet",
    ordinary_carryover_rules_confirmed: true as const,
    ...(category === CharitableCarryoverCategory.Cash60 ||
        category === CharitableCarryoverCategory.CashOther30
      ? {}
      : { original_gift_500_or_less_confirmed: true as const }),
  };
}

test("scheduleA.compute: prior-year carryovers within their limits fill line 13", () => {
  const result = compute({
    agi: 160_154,
    cash_contributions_to_50_percent_organizations: 30_000,
    cash_contributions_other_30: 300,
    noncash_contribution_items: [
      { source: "stock", amount: 100, category: "capital_gain_30" },
      { source: "goods", amount: 200, category: "other_30" },
    ],
    prior_charitable_carryovers: [
      priorCarryover(CharitableCarryoverCategory.Cash60, 3),
      priorCarryover(CharitableCarryoverCategory.CashOther30, 3),
      priorCarryover(CharitableCarryoverCategory.CapitalGain30, 1),
      priorCarryover(CharitableCarryoverCategory.NoncashOther30, 2),
      priorCarryover(CharitableCarryoverCategory.Noncash50, 1),
    ],
  });
  const fields = result.finalizations?.[0]?.fields;
  assertEquals(fields?.line_11_cash_contributions, 30_300);
  assertEquals(fields?.line_12_noncash_contributions, 300);
  assertEquals(fields?.line_13_contribution_carryover, 10);
  assertEquals(deductionInput(result).itemized_deductions, 30_610);
});

test("scheduleA.compute: a carryover the 60% limit does not fully allow is refused", () => {
  assertThrows(
    () =>
      compute({
        agi: 10_000,
        cash_contributions_to_50_percent_organizations: 5_900,
        prior_charitable_carryovers: [
          priorCarryover(CharitableCarryoverCategory.Cash60, 200),
        ],
      }),
    Error,
    "carryover ordering",
  );
});

test("scheduleA.compute: a carryover older than five years has expired", () => {
  assertThrows(
    () =>
      compute({
        agi: 50_000,
        prior_charitable_carryovers: [
          priorCarryover(CharitableCarryoverCategory.Cash60, 100, 2019),
        ],
      }),
    Error,
    "five-year carryover window",
  );
});

test("scheduleA.inputSchema: a noncash carryover needs the Form 8283 threshold answer", () => {
  const parsed = inputSchema.safeParse({
    prior_charitable_carryovers: [{
      ...priorCarryover(CharitableCarryoverCategory.Noncash50, 50),
      original_gift_500_or_less_confirmed: undefined,
    }],
  });
  assertEquals(parsed.success, false);
});

test("scheduleA.inputSchema: line 13 input names the carryover field", () => {
  const parsed = inputSchema.safeParse({ line_13_contribution_carryover: 10 });
  assertEquals(parsed.success, false);
  assertEquals(
    parsed.error?.issues[0].message.includes("prior_charitable_carryovers"),
    true,
  );
});

// Pub. 936 Table 1 lines 3 and 8: married filing separately halves the limits,
// which the Form 1098 node's unreviewed Table 1 does not apply.
test("schedule_a: MFS Form 1098 Table 1 balances over $375,000 need reviewed interest", () => {
  const base = {
    line_8a_mortgage_interest_1098: 20_000,
    form1098_table1_average_balance: 400_000,
  };
  assertEquals(
    scheduleA.inputSchema.safeParse({
      ...base,
      filing_status: FilingStatus.MFS,
    }).success,
    false,
  );
  assertEquals(
    scheduleA.inputSchema.safeParse({
      ...base,
      filing_status: FilingStatus.Single,
    }).success,
    true,
  );
});
