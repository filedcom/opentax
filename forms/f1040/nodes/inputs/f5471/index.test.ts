import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCategory5Inclusions,
  f5471,
  type F5471Item,
  FilingCategory,
} from "./index.ts";

const item: F5471Item = {
  foreign_corp_name: "Example Foreign Corp",
  foreign_corp_reference_id: "FC001",
  country_of_incorporation: "EI",
  functional_currency: "EUR",
  filing_category: FilingCategory.Category5a,
  shareholder_tin: "111223333",
  ownership_percent: 100,
  section_962_election: false,
  reviewed_form5471_source_reference: "2025 reviewed Form 5471",
  schedule_i: {
    line1a: 0,
    line1b: 0,
    line1c: 0,
    line1d: 0,
    line1e: 10_000,
    line1f: 0,
    line1g: 0,
    line1h: 0,
    line2_us_property: 1_000,
    line4_factoring: 0,
    line5a_eligible_dividends: 0,
    line5b_extraordinary_disposition: 0,
    line5c_extraordinary_reduction: 0,
    line5d_hybrid_dividends: 0,
    line5e_other_dividends: 0,
    line6_exchange_gain_or_loss: 0,
    income_blocked: false,
    income_unblocked: false,
    extraordinary_disposition_account: false,
    hybrid_deduction_accounts: 0,
    worksheet_a_reference: "2025 Worksheet A",
    worksheet_b_reference: "2025 Worksheet B",
  },
  schedule_i1: {
    separate_category: "GEN",
    average_exchange_rate: "1.0000",
    gross_income_functional: 65_000,
    effectively_connected_income_functional: 0,
    subpart_f_income_functional: 10_000,
    high_tax_exception_income_functional: 0,
    related_party_dividends_functional: 0,
    foreign_oil_gas_income_functional: 0,
    allocable_deductions_functional: 5_000,
    tested_foreign_taxes_functional: 500,
    tested_foreign_taxes_usd: 500,
    qbai_functional: 100_000,
    interest_expense_functional: 3_000,
    qualified_interest_expense_functional: 0,
    tested_loss_qbai_functional: 0,
    tested_interest_expense_functional: 3_000,
    interest_income_functional: 1_000,
    qualified_interest_income_functional: 0,
    tested_interest_income_functional: 1_000,
    tested_income: 50_000,
    pro_rata_tested_income: 50_000,
    pro_rata_qbai: 100_000,
    pro_rata_tested_interest_income: 1_000,
    pro_rata_tested_interest_expense: 3_000,
    schedule_i1_source_reference: "2025 Schedule I-1",
  },
  schedule_h: {
    book_net_income_functional: 50_000,
    adjustments: {
      capital_gain_add: 0,
      capital_gain_subtract: 0,
      depreciation_add: 0,
      depreciation_subtract: 0,
      depletion_add: 0,
      depletion_subtract: 0,
      investment_allowance_add: 0,
      investment_allowance_subtract: 0,
      statutory_reserves_add: 0,
      statutory_reserves_subtract: 0,
      inventory_add: 0,
      inventory_subtract: 0,
      income_taxes_add: 0,
      income_taxes_subtract: 0,
      foreign_currency_add: 0,
      foreign_currency_subtract: 0,
      other_add: 0,
      other_subtract: 0,
    },
    dastm_gain_or_loss: 0,
    passive_category_ep: 0,
    section901j_category_ep: 0,
    current_ep_usd: 50_000,
    average_exchange_rate: "1.0000",
    source_workpaper_reference: "2025 Schedule H workpaper",
  },
  schedule_e: {
    tax_country_code: "EI",
    foreign_tax_year_end: "2025-12-31",
    us_tax_year_end: "2025-12-31",
    taxable_income_local: 50_000,
    local_currency: "EUR",
    tax_local: 500,
    tax_conversion_rate: "1.0000",
    tax_usd: 500,
    tax_functional: 500,
    section986_election: false,
    lower_tier_deemed_paid_tax: 0,
    disallowed_tax: 0,
    prior_year_tax_balance: 0,
    other_e1_adjustments: 0,
    taxes_deemed_paid_on_inclusion: 0,
    ptep_tax: 0,
    source_workpaper_reference: "2025 Schedule E/E-1 workpaper",
  },
  schedule_g: {
    q1_foreign_partnership: false,
    q2_trust: false,
    q3a_foreign_entity_or_branch: false,
    q3b_different_currency_qbu: false,
    q4a_base_erosion: false,
    q5a_disallowed_267a: false,
    q6a_fdii: false,
    q7_cost_sharing: false,
    q8_triangular_stock: false,
    q9a_intangible_property: false,
    q10_expatriated_subsidiary: false,
    q11_reportable_transaction: false,
    q12_disqualified_901m_tax: false,
    q13_section909_tax: false,
    q14_special_exceptions: false,
    q15_disallowed_interest: false,
    q16_interest_carryforward: false,
    q17a_extraordinary_reduction: false,
    q18a_safe_haven_rate: false,
    q18b_outside_safe_haven_rate: false,
    q19a_covered_debt: false,
    q20a_top_up_tax: false,
    q21a_section304_ep: false,
    source_workpaper_reference: "2025 Schedule G question workpaper",
  },
  schedule_j: {
    opening_post2017_untaxed_ep_functional: 10_000,
    opening_other_untaxed_ep_functional: 0,
    opening_hovering_deficit_or_suspended_tax_functional: 0,
    opening_prior_ptep_functional: 0,
    opening_other_separate_category_ep_functional: 0,
    beginning_balance_adjustments_functional: 0,
    current_tax_splitting_adjustments_functional: 0,
    lower_tier_ptep_distributions_functional: 0,
    nonrecognition_ep_functional: 0,
    other_pre_inclusion_adjustments_functional: 0,
    actual_distributions_functional: 0,
    other_post_inclusion_adjustments_functional: 0,
    hovering_deficit_offset_functional: 0,
    part_ii_beginning_recapture_balance_functional: 0,
    part_ii_future_recapture_functional: 0,
    part_ii_current_recapture_functional: 0,
    subpart_f_inclusion_functional: 10_000,
    section951a_inclusion_functional: 42_000,
    section956_inclusion_functional: 1_000,
    section956_ptep_reclassified_functional: 52_000,
    section956_year_end_spot_rate: "1.0000",
    prior_year_schedule_j_reference: "2024 Schedule J",
    source_workpaper_reference: "2025 Schedule J workpaper",
  },
  schedule_p: {
    opening_ptep_functional: 0,
    opening_ptep_usd_basis: 0,
    beginning_balance_adjustments: 0,
    tax_splitting_adjustments: 0,
    lower_tier_ptep_distributions: 0,
    nonrecognition_ptep: 0,
    other_pre_inclusion_adjustments: 0,
    actual_distributions: 0,
    other_post_inclusion_adjustments: 0,
    section956_ptep_reclassified_usd_basis: 52_000,
    prior_year_schedule_p_reference: "2024 Schedule P",
    source_workpaper_reference: "2025 Schedule P workpaper",
  },
  schedule_r: {
    distributions: [],
    source_workpaper_reference: "2025 CFC distribution ledger",
  },
  form5471_identity: {
    cfc_tax_year_begin: "2025-01-01",
    cfc_tax_year_end: "2025-12-31",
    filer_tax_year_begin: "2025-01-01",
    filer_tax_year_end: "2025-12-31",
    foreign_address: {
      line1: "1 River Street",
      city: "Dublin",
      country_code: "EI",
      postal_code: "D02 ABC1",
    },
    incorporation_date: "2020-01-01",
    principal_business_country_code: "EI",
    principal_business_activity_code: "541990",
    principal_business_activity_description: "Professional services",
    books_custodian_business_name: "Example Foreign Corp",
    books_at_cfc_address: true,
    statutory_agent_business_name: "Example Agent Ltd",
    statutory_agent_at_cfc_address: true,
    no_us_branch_or_agent: true,
    no_us_tax_return: true,
    no_joint_filing_for_other_persons: true,
    stock_class_description: "Common",
    direct_shares_begin: 100,
    direct_shares_end: 100,
    total_outstanding_shares_begin: 100,
    total_outstanding_shares_end: 100,
    source_workpaper_reference: "2025 Form 5471 identity and stock register",
  },
};
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("Category 5a source calculates distinct Schedule 1 lines and Form 8992", () => {
  const calculation = calculateCategory5Inclusions(item);
  assertEquals(calculation.section951a, 11_000);
  assertEquals(calculation.form8992.part_ii_line2, 10_000);
  assertEquals(calculation.form8992.part_ii_line3c, 2_000);
  assertEquals(calculation.form8992.part_ii_line4, 8_000);
  assertEquals(calculation.form8992.part_ii_line5, 42_000);
  const outputs = f5471.compute(ctx, { f5471s: [item] }).outputs;
  assertEquals(outputs.length, 2);
  assertEquals(outputs[0].nodeType, "schedule1");
  assertEquals(outputs[0].fields.line8n_section951a_inclusion, 11_000);
  assertEquals(outputs[0].fields.line8o_section951aa_inclusion, 42_000);
  assertEquals(outputs[0].fields.line8z_other, undefined);
  assertEquals(outputs[1].nodeType, "agi_aggregator");
});

Deno.test("Category 5a rejects missing worksheets, wrong pro rata income, and asserted GILTI", () => {
  const invalid = [
    {
      ...item,
      schedule_i: { ...item.schedule_i, worksheet_a_reference: undefined },
    },
    {
      ...item,
      schedule_i: { ...item.schedule_i, worksheet_b_reference: undefined },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, pro_rata_tested_income: 49_999 },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, gross_income_functional: 64_999 },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, average_exchange_rate: "0" },
    },
    {
      ...item,
      schedule_i1: { ...item.schedule_i1, qbai_functional: 99_999 },
    },
    {
      ...item,
      schedule_h: {
        ...item.schedule_h,
        adjustments: { ...item.schedule_h.adjustments, other_add: 1 },
      },
    },
    {
      ...item,
      schedule_h: { ...item.schedule_h, current_ep_usd: 49_999 },
    },
    {
      ...item,
      schedule_e: { ...item.schedule_e, tax_usd: 499 },
    },
    {
      ...item,
      schedule_e: { ...item.schedule_e, disallowed_tax: 1 },
    },
    {
      ...item,
      schedule_g: { ...item.schedule_g, q7_cost_sharing: true },
    },
    {
      ...item,
      schedule_g: { ...item.schedule_g, source_workpaper_reference: "" },
    },
    {
      ...item,
      schedule_j: { ...item.schedule_j, opening_prior_ptep_functional: 1 },
    },
    {
      ...item,
      schedule_j: {
        ...item.schedule_j,
        section951a_inclusion_functional: 41_999,
      },
    },
    {
      ...item,
      schedule_j: {
        ...item.schedule_j,
        section956_ptep_reclassified_functional: 0,
      },
    },
    {
      ...item,
      schedule_j: { ...item.schedule_j, prior_year_schedule_j_reference: "" },
    },
    {
      ...item,
      schedule_p: {
        ...item.schedule_p,
        section956_ptep_reclassified_usd_basis: 51_999,
      },
    },
    {
      ...item,
      schedule_p: { ...item.schedule_p, opening_ptep_usd_basis: 1 },
    },
    {
      ...item,
      schedule_r: {
        ...item.schedule_r,
        distributions: [{ date: "2025-06-30", amount: 100 }],
      },
    },
    {
      ...item,
      schedule_r: { ...item.schedule_r, source_workpaper_reference: "" },
    },
    {
      ...item,
      form5471_identity: {
        ...item.form5471_identity,
        direct_shares_end: 0,
      },
    },
    {
      ...item,
      form5471_identity: {
        ...item.form5471_identity,
        total_outstanding_shares_end: 101,
      },
    },
    {
      ...item,
      form5471_identity: {
        ...item.form5471_identity,
        cfc_tax_year_end: "2025-11-30",
      },
    },
    {
      ...item,
      schedule_i: { ...item.schedule_i, line5a_eligible_dividends: 1 },
    },
    { ...item, gilti_inclusion: 42_000 },
    { ...item, ownership_percent: 80 },
    { ...item, section_962_election: true },
    { ...item, schedule_i: { ...item.schedule_i, line4_factoring: 500 } },
    { ...item, foreign_corp_reference_id: undefined },
    { ...item, foreign_corp_ein: "123456789" },
  ];
  for (const source of invalid) {
    assertThrows(() =>
      f5471.compute(
        ctx,
        { f5471s: [source] } as Parameters<typeof f5471.compute>[1],
      )
    );
  }
});

Deno.test("Category 5a rejects multiple CFCs until multi-CFC Form 8992 is modeled", () => {
  assertThrows(() =>
    f5471.compute(
      ctx,
      { f5471s: [item, item] } as unknown as Parameters<
        typeof f5471.compute
      >[1],
    )
  );
});
