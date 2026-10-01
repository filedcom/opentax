import { z } from "zod";
import type {
  AtLeastOne,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

// One wholly owned Category 5a CFC, individual shareholder, no section 962
// election. These are reported Schedule I / I-1 facts, not asserted inclusion.
const dollars = z.number().int().nonnegative();
const sourceReference = z.string().trim().min(1);

export enum FilingCategory {
  Category5a = "5a",
}

export const scheduleISchema = z.object({
  line1a: dollars,
  line1b: dollars,
  line1c: dollars,
  line1d: dollars,
  line1e: dollars,
  line1f: dollars,
  line1g: dollars,
  line1h: dollars,
  line2_us_property: dollars,
  // Factoring income has separate reporting treatment outside this route.
  line4_factoring: z.literal(0),
  line5a_eligible_dividends: z.literal(0),
  line5b_extraordinary_disposition: z.literal(0),
  line5c_extraordinary_reduction: z.literal(0),
  line5d_hybrid_dividends: z.literal(0),
  line5e_other_dividends: z.literal(0),
  line6_exchange_gain_or_loss: z.literal(0),
  income_blocked: z.literal(false),
  income_unblocked: z.literal(false),
  extraordinary_disposition_account: z.literal(false),
  hybrid_deduction_accounts: z.literal(0),
  worksheet_a_reference: sourceReference.optional(),
  worksheet_b_reference: sourceReference.optional(),
}).strict().superRefine((value, ctx) => {
  if (
    value.line1e + value.line1f + value.line1g + value.line1h > 0 &&
    !value.worksheet_a_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["worksheet_a_reference"],
      message: "Positive Schedule I lines 1e–1h need Worksheet A source",
    });
  }
  if (value.line2_us_property > 0 && !value.worksheet_b_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["worksheet_b_reference"],
      message: "Positive Schedule I line 2 needs Worksheet B source",
    });
  }
});

export const testedIncomeSchema = z.object({
  separate_category: z.enum(["GEN", "PAS"]),
  average_exchange_rate: z.string().regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  gross_income_functional: z.number().int(),
  effectively_connected_income_functional: z.number().int(),
  subpart_f_income_functional: z.number().int(),
  high_tax_exception_income_functional: z.number().int(),
  related_party_dividends_functional: z.number().int(),
  foreign_oil_gas_income_functional: z.number().int(),
  allocable_deductions_functional: z.number().int(),
  tested_foreign_taxes_functional: dollars,
  tested_foreign_taxes_usd: dollars,
  qbai_functional: dollars,
  interest_expense_functional: dollars,
  qualified_interest_expense_functional: dollars,
  tested_loss_qbai_functional: z.literal(0),
  tested_interest_expense_functional: dollars,
  interest_income_functional: dollars,
  qualified_interest_income_functional: dollars,
  tested_interest_income_functional: dollars,
  tested_income: dollars,
  pro_rata_tested_income: dollars,
  pro_rata_qbai: dollars,
  pro_rata_tested_interest_income: dollars,
  pro_rata_tested_interest_expense: dollars,
  schedule_i1_source_reference: sourceReference,
}).strict().superRefine((v, ctx) => {
  const rate = Number(v.average_exchange_rate);
  const exclusions = v.effectively_connected_income_functional +
    v.subpart_f_income_functional +
    v.high_tax_exception_income_functional +
    v.related_party_dividends_functional +
    v.foreign_oil_gas_income_functional;
  const testedFunctional = v.gross_income_functional - exclusions -
    v.allocable_deductions_functional;
  const issue = (path: string, message: string) =>
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message,
    });
  if (
    testedFunctional < 0 ||
    Math.round(testedFunctional / rate) !== v.tested_income
  ) {
    issue(
      "tested_income",
      "Schedule I-1 line 6 USD must reconcile to functional-currency lines 1–5 and the reviewed exchange rate",
    );
  }
  if (v.tested_income !== v.pro_rata_tested_income) {
    issue(
      "pro_rata_tested_income",
      "Wholly owned CFC tested income must equal the shareholder pro rata amount",
    );
  }
  if (
    Math.round(v.tested_foreign_taxes_functional / rate) !==
      v.tested_foreign_taxes_usd
  ) {
    issue(
      "tested_foreign_taxes_usd",
      "Schedule I-1 line 7 USD must reconcile to functional currency",
    );
  }
  if (Math.round(v.qbai_functional / rate) !== v.pro_rata_qbai) {
    issue(
      "pro_rata_qbai",
      "Schedule I-1 line 8 USD must reconcile to functional currency",
    );
  }
  if (
    v.tested_interest_expense_functional !==
      Math.max(
        0,
        v.interest_expense_functional -
          v.qualified_interest_expense_functional -
          v.tested_loss_qbai_functional,
      ) ||
    Math.round(v.tested_interest_expense_functional / rate) !==
      v.pro_rata_tested_interest_expense
  ) {
    issue(
      "pro_rata_tested_interest_expense",
      "Schedule I-1 line 9d must reconcile to lines 9a–9c and USD conversion",
    );
  }
  if (
    v.tested_interest_income_functional !==
      Math.max(
        0,
        v.interest_income_functional - v.qualified_interest_income_functional,
      ) ||
    Math.round(v.tested_interest_income_functional / rate) !==
      v.pro_rata_tested_interest_income
  ) {
    issue(
      "pro_rata_tested_interest_income",
      "Schedule I-1 line 10c must reconcile to lines 10a–10b and USD conversion",
    );
  }
});

const scheduleHAdjustmentsSchema = z.object({
  capital_gain_add: z.literal(0),
  capital_gain_subtract: z.literal(0),
  depreciation_add: z.literal(0),
  depreciation_subtract: z.literal(0),
  depletion_add: z.literal(0),
  depletion_subtract: z.literal(0),
  investment_allowance_add: z.literal(0),
  investment_allowance_subtract: z.literal(0),
  statutory_reserves_add: z.literal(0),
  statutory_reserves_subtract: z.literal(0),
  inventory_add: z.literal(0),
  inventory_subtract: z.literal(0),
  income_taxes_add: z.literal(0),
  income_taxes_subtract: z.literal(0),
  foreign_currency_add: z.literal(0),
  foreign_currency_subtract: z.literal(0),
  other_add: z.literal(0),
  other_subtract: z.literal(0),
}).strict();

export const scheduleHSchema = z.object({
  book_net_income_functional: z.number().int(),
  adjustments: scheduleHAdjustmentsSchema,
  dastm_gain_or_loss: z.literal(0),
  passive_category_ep: z.literal(0),
  section901j_category_ep: z.literal(0),
  current_ep_usd: z.number().int(),
  average_exchange_rate: z.string().regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  source_workpaper_reference: sourceReference,
}).strict().refine(
  (value) =>
    Math.round(
      value.book_net_income_functional / Number(value.average_exchange_rate),
    ) === value.current_ep_usd,
  "Schedule H general-category E&P must reconcile from functional currency to U.S. dollars",
);

// One directly paid general-category tax, wholly attributable to tested
// income. Other Schedule E/E-1 columns require separate source histories.
export const scheduleESchema = z.object({
  tax_country_code: z.literal("EI"),
  foreign_tax_year_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  us_tax_year_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  taxable_income_local: dollars,
  local_currency: z.string().regex(/^[A-Z]{3}$/),
  tax_local: dollars,
  tax_conversion_rate: z.string().regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  tax_usd: dollars,
  tax_functional: dollars,
  section986_election: z.literal(false),
  lower_tier_deemed_paid_tax: z.literal(0),
  disallowed_tax: z.literal(0),
  prior_year_tax_balance: z.literal(0),
  other_e1_adjustments: z.literal(0),
  taxes_deemed_paid_on_inclusion: z.literal(0),
  ptep_tax: z.literal(0),
  source_workpaper_reference: sourceReference,
}).strict().refine(
  (value) =>
    Math.round(value.tax_local / Number(value.tax_conversion_rate)) ===
      value.tax_usd,
  "Schedule E local tax and conversion rate must reconcile to U.S. dollars",
);

// Schedule G questions for the reviewed CFC with no listed transactions or
// arrangements. A Yes answer needs the related amounts, statements, or forms.
export const scheduleGSchema = z.object({
  q1_foreign_partnership: z.literal(false),
  q2_trust: z.literal(false),
  q3a_foreign_entity_or_branch: z.literal(false),
  q3b_different_currency_qbu: z.literal(false),
  q4a_base_erosion: z.literal(false),
  q5a_disallowed_267a: z.literal(false),
  q6a_fdii: z.literal(false),
  q7_cost_sharing: z.literal(false),
  q8_triangular_stock: z.literal(false),
  q9a_intangible_property: z.literal(false),
  q10_expatriated_subsidiary: z.literal(false),
  q11_reportable_transaction: z.literal(false),
  q12_disqualified_901m_tax: z.literal(false),
  q13_section909_tax: z.literal(false),
  q14_special_exceptions: z.literal(false),
  q15_disallowed_interest: z.literal(false),
  q16_interest_carryforward: z.literal(false),
  q17a_extraordinary_reduction: z.literal(false),
  q18a_safe_haven_rate: z.literal(false),
  q18b_outside_safe_haven_rate: z.literal(false),
  q19a_covered_debt: z.literal(false),
  q20a_top_up_tax: z.literal(false),
  q21a_section304_ep: z.literal(false),
  source_workpaper_reference: sourceReference,
}).strict();

// One general-category Schedule J. Prior-year PTEP and other E&P categories,
// distributions, and nonrecognition or tax-splitting adjustments are absent.
export const scheduleJSchema = z.object({
  opening_post2017_untaxed_ep_functional: dollars,
  opening_other_untaxed_ep_functional: z.literal(0),
  opening_hovering_deficit_or_suspended_tax_functional: z.literal(0),
  opening_prior_ptep_functional: z.literal(0),
  opening_other_separate_category_ep_functional: z.literal(0),
  beginning_balance_adjustments_functional: z.literal(0),
  current_tax_splitting_adjustments_functional: z.literal(0),
  lower_tier_ptep_distributions_functional: z.literal(0),
  nonrecognition_ep_functional: z.literal(0),
  other_pre_inclusion_adjustments_functional: z.literal(0),
  actual_distributions_functional: z.literal(0),
  other_post_inclusion_adjustments_functional: z.literal(0),
  hovering_deficit_offset_functional: z.literal(0),
  part_ii_beginning_recapture_balance_functional: z.literal(0),
  part_ii_future_recapture_functional: z.literal(0),
  part_ii_current_recapture_functional: z.literal(0),
  subpart_f_inclusion_functional: dollars,
  section951a_inclusion_functional: dollars,
  section956_inclusion_functional: dollars,
  section956_ptep_reclassified_functional: dollars,
  section956_year_end_spot_rate: z.string()
    .regex(/^\d{1,10}(\.\d{1,12})?$/)
    .refine((rate) => Number(rate) > 0),
  prior_year_schedule_j_reference: sourceReference,
  source_workpaper_reference: sourceReference,
}).strict();

// One shareholder owns all stock, so Schedule P Part I agrees with the CFC's
// Schedule J PTEP columns. Part II tracks the inclusion-based U.S. dollar basis.
export const schedulePSchema = z.object({
  opening_ptep_functional: z.literal(0),
  opening_ptep_usd_basis: z.literal(0),
  beginning_balance_adjustments: z.literal(0),
  tax_splitting_adjustments: z.literal(0),
  lower_tier_ptep_distributions: z.literal(0),
  nonrecognition_ptep: z.literal(0),
  other_pre_inclusion_adjustments: z.literal(0),
  actual_distributions: z.literal(0),
  other_post_inclusion_adjustments: z.literal(0),
  section956_ptep_reclassified_usd_basis: dollars,
  prior_year_schedule_p_reference: sourceReference,
  source_workpaper_reference: sourceReference,
}).strict();

// The reviewed CFC made no actual distribution during its accounting year.
// A Schedule R row needs dated recipient and E&P characterization facts.
export const scheduleRSchema = z.object({
  distributions: z.tuple([]),
  source_workpaper_reference: sourceReference,
}).strict();

// One foreign-source general-category CFC tested unit, with sales subpart F
// income and tested income. All deductions and taxes have reviewed group
// assignments; no high-tax election or residual income is asserted.
export const scheduleQSchema = z.object({
  sales_gross_income_functional: dollars,
  sales_definitely_related_expenses_functional: z.literal(0),
  sales_average_asset_value_functional: z.literal(0),
  tested_gross_income_functional: dollars,
  tested_other_interest_expense_functional: dollars,
  tested_other_expenses_functional: dollars,
  tested_other_current_year_tax_functional: dollars,
  tested_average_asset_value_functional: dollars,
  foreign_taxes_credit_allowed_usd: dollars,
  residual_gross_income_functional: z.literal(0),
  us_source_income_functional: z.literal(0),
  foreign_oil_gas_income_functional: z.literal(0),
  high_tax_election: z.literal(false),
  source_workpaper_reference: sourceReference,
}).strict();

// Schedule M for the reviewed inventory sale to the sole U.S. shareholder.
// The transaction ledger rules out the remaining related-party columns and
// transaction types, and records no outstanding balances during the year.
export const scheduleMSchema = z.object({
  inventory_sales_to_filer_functional: dollars,
  inventory_sales_to_filer_usd: dollars,
  no_other_related_party_transactions: z.literal(true),
  maximum_related_party_accounts_payable_usd: z.literal(0),
  maximum_related_party_borrowing_usd: z.literal(0),
  maximum_related_party_accounts_receivable_usd: z.literal(0),
  maximum_related_party_lending_usd: z.literal(0),
  source_workpaper_reference: sourceReference,
}).strict();

// Category 4 GAAP income statement: inventory sales and cost of goods sold,
// interest, depreciation, and one current-year income tax expense.
export const scheduleCSchema = z.object({
  gross_sales_receipts_functional: dollars,
  cost_of_goods_sold_functional: dollars,
  interest_income_functional: dollars,
  interest_expense_functional: dollars,
  depreciation_functional: dollars,
  current_income_tax_expense_functional: dollars,
  no_other_income_or_deductions: z.literal(true),
  gaap_translation_rate: z.literal("1.0000"),
  source_workpaper_reference: sourceReference,
}).strict();

// Category 4 GAAP balance sheet with all activity in cash, one depreciable
// asset class, common stock, and retained earnings. No related-party balance.
export const scheduleFSchema = z.object({
  cash_begin_usd: dollars,
  cash_end_usd: dollars,
  depreciable_assets_gross_begin_usd: dollars,
  depreciable_assets_gross_end_usd: dollars,
  accumulated_depreciation_begin_usd: dollars,
  accumulated_depreciation_end_usd: dollars,
  common_stock_begin_usd: dollars,
  common_stock_end_usd: dollars,
  retained_earnings_begin_usd: dollars,
  retained_earnings_end_usd: dollars,
  no_other_assets_liabilities_or_equity: z.literal(true),
  gaap_begin_translation_rate: z.literal("1.0000"),
  gaap_end_translation_rate: z.literal("1.0000"),
  source_workpaper_reference: sourceReference,
}).strict();

const foreignAddressSchema = z.object({
  line1: z.string().trim().min(1).max(35)
    .regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/),
  city: z.string().trim().min(1).max(35)
    .regex(/^([A-Za-z] ?)*[A-Za-z]$/),
  country_code: z.literal("EI"),
  postal_code: z.string().trim().min(1).max(16),
}).strict();

export const form5471IdentitySchema = z.object({
  cfc_tax_year_begin: z.string().regex(/^2025-\d{2}-\d{2}$/),
  cfc_tax_year_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  filer_tax_year_begin: z.string().regex(/^2025-\d{2}-\d{2}$/),
  filer_tax_year_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  foreign_address: foreignAddressSchema,
  incorporation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  principal_business_country_code: z.literal("EI"),
  principal_business_activity_code: z.string().regex(/^\d{6}$/)
    .refine((code) => Number(code) >= 1 && Number(code) <= 999_000),
  principal_business_activity_description: z.string().trim().min(1).max(35)
    .regex(/^[A-Za-z0-9\- &]+$/),
  books_custodian_business_name: z.string().trim().min(1).max(75)
    .regex(/^([A-Za-z0-9#&'()-] ?)*[A-Za-z0-9#&'()-]$/),
  books_at_cfc_address: z.literal(true),
  statutory_agent_business_name: z.string().trim().min(1).max(75)
    .regex(/^([A-Za-z0-9#&'()-] ?)*[A-Za-z0-9#&'()-]$/),
  statutory_agent_at_cfc_address: z.literal(true),
  no_us_branch_or_agent: z.literal(true),
  no_us_tax_return: z.literal(true),
  no_joint_filing_for_other_persons: z.literal(true),
  stock_class_description: z.string().trim().min(1).max(20),
  direct_shares_begin: z.number().int().positive(),
  direct_shares_end: z.number().int().positive(),
  total_outstanding_shares_begin: z.number().int().positive(),
  total_outstanding_shares_end: z.number().int().positive(),
  source_workpaper_reference: sourceReference,
}).strict().refine(
  (value) =>
    value.direct_shares_begin === value.total_outstanding_shares_begin &&
    value.direct_shares_end === value.total_outstanding_shares_end,
  "Wholly owned direct CFC stock counts must equal total outstanding shares at both year ends",
);

export const itemSchema = z.object({
  foreign_corp_name: z.string().trim().min(1).max(75)
    .regex(/^([A-Za-z0-9#&'()-] ?)*[A-Za-z0-9#&'()-]$/),
  foreign_corp_ein: z.string().regex(/^\d{9}$/).optional(),
  foreign_corp_reference_id: z.string().trim().regex(/^[A-Za-z0-9]+$/)
    .max(50).optional(),
  country_of_incorporation: z.literal("EI"),
  functional_currency: z.string().trim().min(1),
  filing_category: z.literal(FilingCategory.Category5a),
  shareholder_tin: z.string().regex(/^\d{9}$/),
  ownership_percent: z.literal(100),
  section_962_election: z.literal(false),
  reviewed_form5471_source_reference: sourceReference,
  schedule_i: scheduleISchema,
  schedule_i1: testedIncomeSchema,
  schedule_h: scheduleHSchema,
  schedule_e: scheduleESchema,
  schedule_g: scheduleGSchema,
  schedule_j: scheduleJSchema,
  schedule_p: schedulePSchema,
  schedule_r: scheduleRSchema,
  schedule_q: scheduleQSchema,
  schedule_m: scheduleMSchema,
  schedule_c: scheduleCSchema,
  schedule_f: scheduleFSchema,
  form5471_identity: form5471IdentitySchema,
}).strict().superRefine((value, ctx) => {
  const e = value.schedule_e;
  const identity = value.form5471_identity;
  if (
    e.local_currency !== value.functional_currency ||
    e.tax_local !== e.tax_functional ||
    e.tax_functional !== value.schedule_i1.tested_foreign_taxes_functional ||
    e.tax_usd !== value.schedule_i1.tested_foreign_taxes_usd ||
    value.schedule_i1.separate_category !== "GEN"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_e"],
      message:
        "Bounded Schedule E tax must be solely general-category tested income, in the CFC functional currency, and reconcile to Schedule I-1 line 7",
    });
  }
  if (
    identity.foreign_address.country_code !== e.tax_country_code ||
    identity.foreign_address.country_code !== value.country_of_incorporation ||
    identity.cfc_tax_year_end !== e.us_tax_year_end
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["form5471_identity"],
      message:
        "Form 5471 CFC jurisdiction and U.S. tax year must reconcile to Schedule E",
    });
  }
  const j = value.schedule_j;
  const q = value.schedule_q;
  const m = value.schedule_m;
  const c = value.schedule_c;
  const f = value.schedule_f;
  const cNet = c.gross_sales_receipts_functional -
    c.cost_of_goods_sold_functional + c.interest_income_functional -
    c.interest_expense_functional - c.depreciation_functional -
    c.current_income_tax_expense_functional;
  const fAssetsBegin = f.cash_begin_usd +
    f.depreciable_assets_gross_begin_usd -
    f.accumulated_depreciation_begin_usd;
  const fAssetsEnd = f.cash_end_usd + f.depreciable_assets_gross_end_usd -
    f.accumulated_depreciation_end_usd;
  if (
    c.gross_sales_receipts_functional - c.cost_of_goods_sold_functional +
          c.interest_income_functional !==
      value.schedule_i1.gross_income_functional ||
    c.cost_of_goods_sold_functional !==
      m.inventory_sales_to_filer_functional -
        q.sales_gross_income_functional ||
    c.interest_income_functional !==
      value.schedule_i1.interest_income_functional ||
    c.interest_expense_functional !==
      q.tested_other_interest_expense_functional ||
    c.depreciation_functional !== q.tested_other_expenses_functional ||
    c.current_income_tax_expense_functional !==
      value.schedule_e.tax_functional ||
    cNet !== value.schedule_h.book_net_income_functional ||
    cNet !== f.retained_earnings_end_usd -
        f.retained_earnings_begin_usd ||
    fAssetsBegin !==
      f.common_stock_begin_usd + f.retained_earnings_begin_usd ||
    fAssetsEnd !== f.common_stock_end_usd + f.retained_earnings_end_usd ||
    f.depreciable_assets_gross_begin_usd !==
      f.depreciable_assets_gross_end_usd ||
    f.accumulated_depreciation_end_usd -
          f.accumulated_depreciation_begin_usd !== c.depreciation_functional ||
    f.common_stock_begin_usd !== f.common_stock_end_usd ||
    f.cash_end_usd - f.cash_begin_usd !== cNet + c.depreciation_functional ||
    f.retained_earnings_begin_usd !==
      value.schedule_j.opening_post2017_untaxed_ep_functional ||
    f.retained_earnings_end_usd !==
      f.retained_earnings_begin_usd + cNet
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_c"],
      message:
        "Category 4 GAAP income statement and balance sheet must reconcile to Schedules I-1, E, H, J, M, and Q",
    });
  }
  if (
    m.inventory_sales_to_filer_functional !==
      q.sales_gross_income_functional + c.cost_of_goods_sold_functional ||
    Math.round(
        m.inventory_sales_to_filer_functional /
          Number(value.schedule_i1.average_exchange_rate),
      ) !== m.inventory_sales_to_filer_usd
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_m"],
      message:
        "Schedule M related-person inventory proceeds less Schedule C cost of goods sold must reconcile to Schedule Q sales income and Schedule I line 1f",
    });
  }
  if (
    value.schedule_i.line1a !== 0 ||
    value.schedule_i.line1b !== 0 ||
    value.schedule_i.line1c !== 0 ||
    value.schedule_i.line1d !== 0 ||
    value.schedule_i.line1e !== 0 ||
    value.schedule_i.line1g !== 0 ||
    value.schedule_i.line1h !== 0 ||
    value.schedule_i1.effectively_connected_income_functional !== 0 ||
    value.schedule_i1.high_tax_exception_income_functional !== 0 ||
    value.schedule_i1.related_party_dividends_functional !== 0 ||
    value.schedule_i1.foreign_oil_gas_income_functional !== 0 ||
    q.sales_gross_income_functional !==
      value.schedule_i1.subpart_f_income_functional ||
    value.schedule_i.line1f !==
      Math.round(
        q.sales_gross_income_functional /
          Number(value.schedule_i1.average_exchange_rate),
      ) ||
    q.tested_gross_income_functional !==
      value.schedule_i1.gross_income_functional -
        value.schedule_i1.subpart_f_income_functional ||
    q.tested_other_interest_expense_functional !==
      value.schedule_i1.interest_expense_functional ||
    q.tested_other_interest_expense_functional +
          q.tested_other_expenses_functional +
          q.tested_other_current_year_tax_functional !==
      value.schedule_i1.allocable_deductions_functional ||
    q.tested_other_current_year_tax_functional !==
      value.schedule_e.tax_functional ||
    q.foreign_taxes_credit_allowed_usd !== value.schedule_e.tax_usd ||
    q.sales_gross_income_functional +
          q.tested_gross_income_functional -
          q.tested_other_interest_expense_functional -
          q.tested_other_expenses_functional -
          q.tested_other_current_year_tax_functional !==
      value.schedule_h.book_net_income_functional
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_q"],
      message:
        "General-category Schedule Q sales and tested groups must reconcile to Schedules I, I-1, E, and H",
    });
  }
  const subpartF = value.schedule_i.line1a + value.schedule_i.line1b +
    value.schedule_i.line1c + value.schedule_i.line1d +
    value.schedule_i.line1e +
    value.schedule_i.line1f + value.schedule_i.line1g + value.schedule_i.line1h;
  const { gilti } = calculateCategory5Inclusions(value);
  if (
    value.schedule_p.section956_ptep_reclassified_usd_basis !==
      subpartF + gilti ||
    value.schedule_p.opening_ptep_functional !==
      value.schedule_j.opening_prior_ptep_functional
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_p"],
      message:
        "Schedule P dollar-basis reclassification must match sole-shareholder inclusions and opening PTEP must match Schedule J",
    });
  }
  if (
    Math.round(
        j.subpart_f_inclusion_functional /
          Number(value.schedule_i1.average_exchange_rate),
      ) !== subpartF ||
    Math.round(
        j.section951a_inclusion_functional /
          Number(value.schedule_i1.average_exchange_rate),
      ) !== gilti ||
    Math.round(
        j.section956_inclusion_functional /
          Number(j.section956_year_end_spot_rate),
      ) !==
      value.schedule_i.line2_us_property ||
    j.section956_ptep_reclassified_functional !==
      j.subpart_f_inclusion_functional + j.section951a_inclusion_functional ||
    j.subpart_f_inclusion_functional +
          j.section951a_inclusion_functional +
          j.section956_inclusion_functional >
      j.opening_post2017_untaxed_ep_functional +
        value.schedule_h.book_net_income_functional
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schedule_j"],
      message:
        "Schedule J functional-currency inclusions must reconcile to Schedule I, Form 8992, and available general-category E&P",
    });
  }
}).refine(
  (value) =>
    (value.foreign_corp_ein === undefined) !==
      (value.foreign_corp_reference_id === undefined),
  "CFC needs exactly one EIN or foreign reference ID",
);

export const inputSchema = z.object({
  f5471s: z.tuple([itemSchema]),
}).strict();

export type F5471Item = z.infer<typeof itemSchema>;

export function calculateCategory5Inclusions(item: F5471Item) {
  const scheduleI = item.schedule_i;
  const section951a = scheduleI.line1a + scheduleI.line1b +
    scheduleI.line1c + scheduleI.line1d + scheduleI.line1e +
    scheduleI.line1f + scheduleI.line1g + scheduleI.line1h +
    scheduleI.line2_us_property;
  // The 2025 Schedule 1 instruction cites Schedule I lines 1a–1h and 2;
  // line 4 factoring does not enter line 8n.
  const tested = item.schedule_i1;
  const netTestedIncome = tested.pro_rata_tested_income;
  const dtir = Math.round(tested.pro_rata_qbai * 0.1);
  const specifiedInterestExpense = Math.max(
    0,
    tested.pro_rata_tested_interest_expense -
      tested.pro_rata_tested_interest_income,
  );
  const netDtir = Math.max(0, dtir - specifiedInterestExpense);
  const gilti = Math.max(0, netTestedIncome - netDtir);
  return {
    section951a,
    gilti,
    form8992: {
      part_i_line1: netTestedIncome,
      part_i_line2: 0,
      part_i_line3: netTestedIncome,
      part_ii_line1: netTestedIncome,
      part_ii_line2: dtir,
      part_ii_line3a: tested.pro_rata_tested_interest_expense,
      part_ii_line3b: tested.pro_rata_tested_interest_income,
      part_ii_line3c: specifiedInterestExpense,
      part_ii_line4: netDtir,
      part_ii_line5: gilti,
    },
  };
}

class F5471Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5471";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const { f5471s: [item] } = inputSchema.parse(rawInput);
    const { section951a, gilti } = calculateCategory5Inclusions(item);
    const fields = {
      ...(section951a > 0 ? { line8n_section951a_inclusion: section951a } : {}),
      ...(gilti > 0 ? { line8o_section951aa_inclusion: gilti } : {}),
    };
    if (Object.keys(fields).length === 0) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(
          schedule1,
          fields as AtLeastOne<z.infer<typeof schedule1.inputSchema>>,
        ),
        this.outputNodes.output(
          agi_aggregator,
          fields as AtLeastOne<z.infer<typeof agi_aggregator.inputSchema>>,
        ),
      ],
    };
  }
}

export const f5471 = new F5471Node();
