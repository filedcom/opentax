import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { ordinaryTax2025 } from "../../worksheets/tax_table_2025.ts";

export enum IncomeCategory {
  Passive = "passive",
  General = "general",
  Section951A = "section_951a",
  Branch = "branch",
  Treaty = "treaty",
  Section901j = "section_901j",
}

export enum ForeignTaxKind {
  Interest = "interest",
  Dividends = "dividends",
  RentsRoyalties = "rents_royalties",
  Other = "other",
}

export enum ForeignTaxCreditMethod {
  Paid = "paid",
  Accrued = "accrued",
}

export const foreignTaxCurrencySchema = z.object({
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().finite().positive(),
  usd_per_foreign_unit: z.number().finite().positive(),
  conversion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  conversion_rate_explanation: z.string().trim().min(1).optional(),
  source_document_reference: z.string().trim().min(1),
}).strict();

export const singleSourcePdfReviewSchema = z.object({
  source_document_reference: z.string().trim().min(1),
  all_foreign_tax_items_identified_confirmed: z.literal(true),
  all_worldwide_income_sources_identified_confirmed: z.literal(true),
  all_part_i_deductions_and_losses_except_standard_zero_confirmed: z.literal(
    true,
  ),
  no_foreign_tax_reduction_confirmed: z.literal(true),
  no_high_tax_kickout_confirmed: z.literal(true),
  no_foreign_income_adjustment_confirmed: z.literal(true),
  no_section_960c_increase_confirmed: z.literal(true),
  no_international_boycott_confirmed: z.literal(true),
  no_prior_year_carryover_or_carryback_confirmed: z.literal(true),
  no_preferential_rate_income_confirmed: z.literal(true),
  no_other_category_credit_confirmed: z.literal(true),
}).strict();

export const singleSourceK3PdfReviewSchema = singleSourcePdfReviewSchema.omit({
  no_foreign_tax_reduction_confirmed: true,
}).extend({
  only_identified_k3_line12_reduction_confirmed: z.literal(true),
}).strict();

export const partnershipK3PassiveInterestSchema = z.object({
  partnership_ein: z.string().regex(/^\d{9}$/),
  k1_source_document_reference: z.string().trim().min(1),
  k3_source_document_reference: z.string().trim().min(1),
  part_ii_section_1_line_6_passive_interest: z.number().finite().positive(),
  part_ii_section_1_line_24_passive_total: z.number().finite().positive(),
  part_iii_section_4_line_1_foreign_tax: z.number().finite().positive(),
  part_iii_section_4_line_2_tax_reduction: z.number().finite().positive(),
  irs_country_code: z.string().length(2),
  tax_paid_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  foreign_tax_currency: foreignTaxCurrencySchema,
  no_other_income_tax_or_reduction_on_k3_confirmed: z.literal(true),
}).strict();

export const sCorpK3PassiveInterestSchema = z.object({
  corporation_ein: z.string().regex(/^\d{9}$/),
  k1_source_document_reference: z.string().trim().min(1),
  k3_source_document_reference: z.string().trim().min(1),
  part_ii_section_1_line_6_passive_interest: z.number().finite().positive(),
  part_ii_section_1_line_24_passive_total: z.number().finite().positive(),
  part_iii_section_3_line_1_foreign_tax: z.number().finite().positive(),
  part_iii_section_3_line_2_tax_reduction: z.number().finite().positive(),
  irs_country_code: z.string().length(2),
  tax_paid_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  foreign_tax_currency: foreignTaxCurrencySchema,
  no_other_income_tax_or_reduction_on_k3_confirmed: z.literal(true),
}).strict();

export const alternativeCompensationSourcingSchema = z.object({
  specific_compensation_description: z.string().trim().min(1).max(100),
  alternative_allocation_basis: z.string().trim().min(1).max(100),
  alternative_allocation_computation: z.string().trim().min(1).max(100),
  geographical_comparison: z.string().trim().min(1).max(100),
  compensation_item_total_usd: z.number().finite().positive(),
  alternative_us_source_usd: z.number().finite().nonnegative(),
  alternative_foreign_source_usd: z.number().finite().nonnegative(),
  ordinary_us_source_usd: z.number().finite().nonnegative(),
  ordinary_foreign_source_usd: z.number().finite().nonnegative(),
  source_document_reference: z.string().trim().min(1),
}).strict().superRefine((item, ctx) => {
  const cents = (amount: number) => Math.round(amount * 100);
  const total = cents(item.compensation_item_total_usd);
  if (
    cents(item.alternative_us_source_usd) +
          cents(item.alternative_foreign_source_usd) !== total ||
    cents(item.ordinary_us_source_usd) +
          cents(item.ordinary_foreign_source_usd) !== total
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["compensation_item_total_usd"],
      message:
        "Form 1116 line 1b ordinary and alternative U.S./foreign amounts must each equal the specific compensation total",
    });
  }
});

export const foreignTaxItemSchema = z.object({
  foreign_tax_paid: z.number().nonnegative(),
  // Schedule K-3 has already apportioned this line-12 reduction by category.
  // It is not a reduction to the gross foreign tax shown in Part II.
  schedule_k3_line12_reduction: z.object({
    amount: z.number().finite().positive(),
    source_document_reference: z.string().trim().min(1),
  }).strict().optional(),
  partnership_k3_passive_interest: partnershipK3PassiveInterestSchema
    .optional(),
  s_corp_k3_passive_interest: sCorpK3PassiveInterestSchema.optional(),
  income_category: z.nativeEnum(IncomeCategory),
  foreign_gross_income: z.number().nonnegative(),
  foreign_income_source_document_reference: z.string().trim().min(1)
    .optional(),
  directly_allocable_deductions: z.number().nonnegative().optional(),
  direct_expense_explanation: z.string().trim().min(1).max(9000).optional(),
  apportioned_deductions: z.number().nonnegative().optional(),
  excluded_income: z.number().nonnegative().optional(),
  irs_country_code: z.string().length(2).optional(),
  tax_paid_or_accrued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tax_kind: z.nativeEnum(ForeignTaxKind).optional(),
  tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod).optional(),
  tax_reported_on_1099: z.boolean().optional(),
  foreign_tax_currency: foreignTaxCurrencySchema.optional(),
  alternative_compensation_sourcing: alternativeCompensationSourcingSchema
    .optional(),
});

const taxDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value;
  },
  "Form 1116 Schedule C needs a real calendar date",
);
const taxYearEndSchema = taxDateSchema.refine(
  (value) => value < "2025-01-01",
  "Form 1116 Schedule C relation-back year must precede 2025",
);
const affectedYearEndSchema = taxDateSchema.refine(
  (value) => value <= "2025-12-31",
  "Form 1116 Schedule C affected year cannot follow the current return",
);
const moneySchema = z.number().finite().nonnegative();
function twoYearNonpaymentDate(foreignTaxYearEnd: string): string {
  const date = new Date(`${foreignTaxYearEnd}T00:00:00Z`);
  const year = date.getUTCFullYear() + 2;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(date.getUTCDate(), lastDay),
  )).toISOString().slice(0, 10);
}
const payorIdentifierSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ein"),
    value: z.string().regex(/^[0-9]{9}$/),
  }).strict(),
  z.object({
    kind: z.literal("foreign_reference"),
    value: z.string().regex(/^[A-Za-z0-9]{1,50}$/),
  }).strict(),
]);
const payorRedeterminationSchema = z.object({
  payor_name: z.string().trim().min(1),
  payor_identifier: payorIdentifierSchema,
  irs_country_code: z.string().regex(/^[A-Z]{2}$/),
  foreign_tax_year_end: taxDateSchema,
  payor_foreign_income_subject_to_tax: moneySchema,
  local_currency_code: z.string().regex(/^[A-Z]{3}$/),
  functional_currency_code: z.string().regex(/^[A-Z]{3}$/),
  tax_change_local_currency: z.number().finite().positive(),
  tax_change_functional_currency: z.number().finite().positive(),
  // The printed schedule divides local tax by this rate for column 10.
  original_local_units_per_usd: z.number().finite().positive(),
  tax_change_usd: z.number().finite().positive(),
  payor_tax_usd_on_filed_return: moneySchema,
  payor_revised_tax_usd: moneySchema,
  event_date: taxDateSchema,
  event_kind: z.enum([
    "additional_accrued_tax",
    "foreign_tax_refund_or_reduction",
    "accrued_tax_unpaid_after_24_months",
  ]),
  source_document_references: z.array(z.string().trim().min(1)).min(1),
}).strict().superRefine((event, ctx) => {
  const rounded = (amount: number) => Math.round(amount * 100);
  const decrease = event.event_kind !== "additional_accrued_tax";
  const expected = event.payor_tax_usd_on_filed_return +
    (decrease ? -event.tax_change_usd : event.tax_change_usd);
  if (rounded(expected) !== rounded(event.payor_revised_tax_usd)) {
    ctx.addIssue({
      code: "custom",
      path: ["payor_revised_tax_usd"],
      message:
        "Form 1116 Schedule C payor original tax and change do not reconcile to revised tax",
    });
  }
  if (
    rounded(
      event.tax_change_local_currency /
        event.original_local_units_per_usd,
    ) !==
      rounded(event.tax_change_usd)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["tax_change_usd"],
      message:
        "Form 1116 Schedule C local tax and original conversion rate do not reconcile to U.S. dollars",
    });
  }
  if (event.event_date.slice(0, 4) !== "2025") {
    ctx.addIssue({
      code: "custom",
      path: ["event_date"],
      message: "Form 1116 Schedule C source must describe a 2025 event",
    });
  }
});

// A category/year ledger ties each payor row to the filed Form 1116 and every
// reviewed affected return. It is source evidence, not permission to file a
// Schedule C until native Part I-IV and amended-year handling are complete.
export const redeterminationDisclosureSchema = z.object({
  income_category: z.nativeEnum(IncomeCategory),
  relation_back_tax_year: z.number().int().min(1900).max(2024),
  relation_back_year_end: taxYearEndSchema,
  tax_credit_method_in_relation_back_year: z.nativeEnum(
    ForeignTaxCreditMethod,
  ),
  payor_events: z.array(payorRedeterminationSchema).min(1),
  filed_form1116: z.object({
    foreign_taxes_paid_or_accrued_usd: moneySchema,
    foreign_tax_credit_claimed_usd: moneySchema,
    source_document_reference: z.string().trim().min(1),
  }).strict(),
  redetermined_form1116: z.object({
    foreign_taxes_paid_or_accrued_usd: moneySchema,
    foreign_tax_credit_claimed_usd: moneySchema,
    calculation_document_reference: z.string().trim().min(1),
  }).strict(),
  affected_years: z.array(
    z.object({
      tax_year_end: affectedYearEndSchema,
      us_tax_liability_on_filed_return_usd: moneySchema,
      redetermined_us_tax_liability_usd: moneySchema,
      filed_return_document_reference: z.string().trim().min(1),
      recalculation_document_reference: z.string().trim().min(1),
    }).strict(),
  ).min(1),
  all_affected_years_reviewed: z.literal(true),
  source_document_references: z.array(z.string().trim().min(1)).min(1),
}).strict().superRefine((ledger, ctx) => {
  const rounded = (amount: number) => Math.round(amount * 100);
  if (
    Number(ledger.relation_back_year_end.slice(0, 4)) !==
      ledger.relation_back_tax_year
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["relation_back_year_end"],
      message:
        "Form 1116 Schedule C relation-back year end does not match its tax year",
    });
  }
  if (
    ledger.tax_credit_method_in_relation_back_year ===
      ForeignTaxCreditMethod.Paid &&
    ledger.payor_events.some((event) =>
      event.event_kind === "additional_accrued_tax"
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payor_events"],
      message:
        "Additional prior-year tax paid on the cash method belongs on current-year Form 1116 Part II, not Schedule C Part I",
    });
  }
  if (
    ledger.tax_credit_method_in_relation_back_year ===
      ForeignTaxCreditMethod.Paid &&
    ledger.payor_events.some((event) =>
      event.event_kind === "accrued_tax_unpaid_after_24_months"
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payor_events"],
      message:
        "Form 1116 Schedule C 24-month deemed refund applies to accrued foreign taxes, not paid-method credits",
    });
  }
  if (
    ledger.payor_events.some((event) =>
      event.event_kind === "accrued_tax_unpaid_after_24_months" &&
      event.event_date !== twoYearNonpaymentDate(event.foreign_tax_year_end)
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payor_events"],
      message:
        "Form 1116 Schedule C two-year nonpayment date must be 24 months after the foreign tax year end",
    });
  }
  const change = ledger.payor_events.reduce(
    (sum, event) =>
      sum +
      (event.event_kind === "additional_accrued_tax"
        ? event.tax_change_usd
        : -event.tax_change_usd),
    0,
  );
  if (
    rounded(
      ledger.filed_form1116.foreign_taxes_paid_or_accrued_usd +
        change,
    ) !==
      rounded(
        ledger.redetermined_form1116.foreign_taxes_paid_or_accrued_usd,
      )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["redetermined_form1116"],
      message:
        "Form 1116 Schedule C payor changes do not reconcile filed and redetermined category tax",
    });
  }
  if (
    ledger.filed_form1116.foreign_tax_credit_claimed_usd >
      ledger.filed_form1116.foreign_taxes_paid_or_accrued_usd ||
    ledger.redetermined_form1116.foreign_tax_credit_claimed_usd >
      ledger.redetermined_form1116.foreign_taxes_paid_or_accrued_usd
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["filed_form1116"],
      message:
        "Form 1116 Schedule C category credit cannot exceed its foreign tax",
    });
  }
  const years = ledger.affected_years.map((year) => year.tax_year_end);
  if (
    !years.includes(ledger.relation_back_year_end) ||
    new Set(years).size !== years.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["affected_years"],
      message:
        "Form 1116 Schedule C needs one unique review for each affected year, including the relation-back year",
    });
  }
});
export type RedeterminationDisclosure = z.infer<
  typeof redeterminationDisclosureSchema
>;

export const carryoverReviewSchema = z.object({
  income_category: z.nativeEnum(IncomeCategory),
  prior_year_form1116_line23_limit: z.number().nonnegative(),
  prior_year_form1116_line24_allowed_credit: z.number().nonnegative(),
  prior_year_schedule_b_line8_balance: z.number().int().nonnegative(),
  source_document_references: z.array(z.string().trim().min(1)).min(1),
  no_foreign_tax_redetermination_or_special_adjustment: z.literal(true),
}).strict();

const priorYearCarryoverVintageSchema = z.object({
  vintage_tax_year: z.union([
    z.literal(2020),
    z.literal(2021),
    z.literal(2022),
    z.literal(2023),
    z.literal(2024),
  ]),
  prior_year_schedule_b_line8_vintage_amount: z.number().int().positive(),
}).strict();

export const priorYearCarryoverSchema = z.object({
  income_category: z.nativeEnum(IncomeCategory),
  // Filed 2024 Schedule B line 8: reviewed 2020-2024 columns and total.
  // In 2025 these shift to the fifth- through first-preceding columns.
  vintages: z.array(priorYearCarryoverVintageSchema).min(1).max(5),
  prior_year_schedule_b_line8_total: z.number().int().positive(),
  prior_year_schedule_b_line8_other_vintages_total: z.literal(0),
  no_intervening_adjustments: z.literal(true),
  source_document_references: z.array(z.string().trim().min(1)).min(1),
}).strict().superRefine((source, ctx) => {
  if (
    new Set(source.vintages.map((v) => v.vintage_tax_year)).size !==
      source.vintages.length
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 1116 prior-year Schedule B has a duplicate vintage",
      path: ["vintages"],
    });
  }
  const total = source.vintages.reduce(
    (sum, v) => sum + v.prior_year_schedule_b_line8_vintage_amount,
    0,
  );
  if (total !== source.prior_year_schedule_b_line8_total) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 1116 prior-year Schedule B line 8 vintages do not match its total",
      path: ["prior_year_schedule_b_line8_total"],
    });
  }
});

const vehicleInterestAssetSchema = z.object({
  asset_id: z.string().trim().min(1),
  source_document_reference: z.string().trim().min(1),
  beginning_tax_book_value: z.number().finite().nonnegative(),
  ending_tax_book_value: z.number().finite().nonnegative(),
  income_source: z.enum(["us", "foreign"]),
  income_category: z.nativeEnum(IncomeCategory).optional(),
  irs_country_code: z.string().length(2).optional(),
});

const vehicleInterestAssetMethodSchema = z.object({
  all_assets_included_verified: z.literal(true),
  assets: z.array(vehicleInterestAssetSchema).min(1),
});

export const inputSchema = z.object({
  foreign_tax_items: z.array(foreignTaxItemSchema).optional(),
  foreign_tax_redeterminations: z.array(redeterminationDisclosureSchema).min(1)
    .optional(),
  carryover_reviews: z.array(carryoverReviewSchema).optional(),
  prior_year_carryovers: z.array(priorYearCarryoverSchema).optional(),
  // Signed Form 1040 lines 11b minus 14, before the line 15 zero floor.
  worldwide_taxable_income: z.number().optional(),
  enhanced_senior_deduction: z.number().nonnegative().optional(),
  qualified_vehicle_loan_interest_deduction: z.number().nonnegative()
    .optional(),
  vehicle_interest_asset_method: vehicleInterestAssetMethodSchema.optional(),
  worldwide_gross_income: z.number().nonnegative().optional(),
  general_deductions: z.number().nonnegative().optional(),
  standard_or_itemized_deduction: z.number().nonnegative().optional(),
  other_deductions: z.number().nonnegative().optional(),
  // Separate expenses on Form 1116 Part I line 3b, required by the 2025
  // instructions and retained for its linked MeF supporting statement.
  other_deductions_explanation: z.string().trim().min(1).max(9000).optional(),
  us_tax_before_credits: z.number().nonnegative().optional(),
  tentative_minimum_tax: z.number().nonnegative().optional(),
  known_foreign_qualified_dividends: z.number().nonnegative().optional(),
  // Deposited by the regular-tax worksheet, not entered as a Form 1116 answer.
  regular_tax_preference_facts: z.object({
    taxable_income: z.number().nonnegative(),
    qualified_dividends: z.number().nonnegative(),
    net_capital_gain: z.number().nonnegative(),
    filing_status: z.nativeEnum(FilingStatus),
    special_rate_gain: z.number().nonnegative(),
    form4952_election: z.number().nonnegative(),
    foreign_earned_income_exclusion: z.number().nonnegative(),
    form8615_applies: z.boolean(),
    regular_tax_before_additional_items: z.number().nonnegative(),
  }).strict().optional(),
  foreign_preferential_income_review: z.object({
    all_foreign_sources_reviewed: z.literal(true),
    foreign_qualified_dividends: z.literal(0),
    foreign_capital_gains_or_losses_present: z.literal(false),
    source_document_references: z.array(z.string().trim().min(1)).min(1),
    no_amt_liability_verified: z.literal(true),
  }).strict().optional(),
  single_source_pdf_review: z.union([
    singleSourcePdfReviewSchema,
    singleSourceK3PdfReviewSchema,
  ]).optional(),
});

type ForeignTaxItem = z.infer<typeof foreignTaxItemSchema>;
type Form1116Input = z.infer<typeof inputSchema>;
type CarryoverReview = z.infer<typeof carryoverReviewSchema>;

/** 2025 i1116 Worksheet for Line 18, QDCGT branch, with zero foreign preference. */
export function adjustedQualifiedDividendLine18(
  signedWorldwideIncome: number,
  facts: NonNullable<Form1116Input["regular_tax_preference_facts"]>,
): number {
  const line1 = signedWorldwideIncome;
  const taxable = Math.round(facts.taxable_income);
  const qualifiedDividends = Math.round(facts.qualified_dividends);
  const netCapitalGain = Math.round(facts.net_capital_gain);
  const cfg = CONFIG_BY_YEAR[2025];
  const line4 = qualifiedDividends + netCapitalGain;
  const qdcgtLine5 = Math.max(0, taxable - line4);
  const qdcgtLine7 = Math.min(
    taxable,
    cfg.qdcgtZeroCeiling[facts.filing_status],
  );
  const qdcgtLine8 = Math.min(qdcgtLine5, qdcgtLine7);
  const qdcgtLine9 = qdcgtLine7 - qdcgtLine8;
  const qdcgtLine10 = Math.min(taxable, line4);
  const qdcgtLine12 = Math.max(0, qdcgtLine10 - qdcgtLine9);
  const qdcgtLine14 = Math.min(
    taxable,
    cfg.qdcgtTwentyFloor[facts.filing_status],
  );
  const qdcgtLine16 = Math.max(0, qdcgtLine14 - (qdcgtLine5 + qdcgtLine9));
  const qdcgtLine17 = Math.min(qdcgtLine12, qdcgtLine16);
  const qdcgtLine20 = Math.max(0, qdcgtLine10 - (qdcgtLine9 + qdcgtLine17));
  const preferentialTax = Math.round(
    qdcgtLine17 * 0.15 + qdcgtLine20 * 0.20 +
      ordinaryTax2025(qdcgtLine5, facts.filing_status),
  );
  const ordinaryTax = ordinaryTax2025(taxable, facts.filing_status);
  if (qdcgtLine5 <= 0 || preferentialTax >= ordinaryTax) {
    return Math.max(0, line1);
  }
  if (facts.regular_tax_before_additional_items !== preferentialTax) {
    throw new Error(
      "Form 1116 preferential worksheet does not match the sourced regular-tax calculation",
    );
  }
  // Worksheet lines 2-5 are skipped for the QDCGT route. Lines 6/8/10
  // come from QDCGT lines 20/17/9. With no foreign preferential income,
  // foreign-category line 17 requires no rate-differential adjustment.
  const worksheetLine7 = Math.round(qdcgtLine20 * 0.4595);
  const worksheetLine9 = Math.round(qdcgtLine17 * 0.5946);
  const worksheetLine11 = worksheetLine7 + worksheetLine9 + qdcgtLine9;
  return Math.max(0, Math.round(line1 - worksheetLine11));
}

export const categorySummarySchema = z.object({
  category: z.nativeEnum(IncomeCategory),
  items: z.array(foreignTaxItemSchema).min(1),
  foreignTaxPaid: z.number().nonnegative(),
  foreignTaxReduction: z.number().nonnegative().optional(),
  foreignGrossIncome: z.number().nonnegative(),
  includedForeignIncome: z.number(),
  directlyAllocableDeductions: z.number().nonnegative(),
  explicitlyApportionedDeductions: z.number().nonnegative(),
  automaticallyApportionedDeductions: z.number().nonnegative(),
  vehicleInterestByCountry: z.array(z.object({
    irsCountryCode: z.string().length(2),
    amount: z.number().nonnegative(),
  })).optional(),
  foreignTaxableIncome: z.number(),
  allowedCredit: z.number().nonnegative(),
  currentYearExcessTax: z.number().nonnegative(),
  priorYearCarryover: z.number().nonnegative().optional(),
  usedPriorYearCarryover: z.number().nonnegative().optional(),
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;

function categoryTotals(
  items: ForeignTaxItem[],
  worldwideGrossIncome: number,
  generalDeductions: number,
  vehicleInterestAllocations: Map<string, number>,
): Omit<CategorySummary, "allowedCredit" | "currentYearExcessTax">[] {
  const categories = [...new Set(items.map((item) => item.income_category))];
  return categories.map((category) => {
    const matching = items.filter((item) => item.income_category === category);
    const foreignTaxPaid = matching.reduce(
      (sum, item) => sum + item.foreign_tax_paid,
      0,
    );
    const foreignTaxReduction = matching.reduce(
      (sum, item) => sum + (item.schedule_k3_line12_reduction?.amount ?? 0),
      0,
    );
    if (foreignTaxReduction > foreignTaxPaid) {
      throw new Error(
        "Form 1116 Schedule K-3 line 12 reduction exceeds category foreign tax",
      );
    }
    const foreignGrossIncome = matching.reduce(
      (sum, item) => sum + item.foreign_gross_income,
      0,
    );
    for (const item of matching) {
      if ((item.excluded_income ?? 0) > item.foreign_gross_income) {
        throw new Error("Form 1116 excluded income exceeds foreign income");
      }
      if (
        (item.schedule_k3_line12_reduction?.amount ?? 0) >
          item.foreign_tax_paid
      ) {
        throw new Error(
          "Form 1116 Schedule K-3 line 12 reduction exceeds its sourced foreign tax",
        );
      }
    }
    const excludedIncome = matching.reduce(
      (sum, item) => sum + (item.excluded_income ?? 0),
      0,
    );
    const includedForeignIncome = foreignGrossIncome - excludedIncome;
    const directlyAllocableDeductions = matching.reduce(
      (sum, item) => sum + (item.directly_allocable_deductions ?? 0),
      0,
    );
    const explicitApportioned = matching.reduce(
      (sum, item) => sum + (item.apportioned_deductions ?? 0),
      0,
    );
    if (generalDeductions > 0 && worldwideGrossIncome <= 0) {
      throw new Error(
        "Form 1116 needs worldwide gross income to apportion deductions",
      );
    }
    const automaticApportioned = worldwideGrossIncome > 0
      ? matching.reduce(
        (sum, item) =>
          sum +
          generalDeductions *
            fraction(item.foreign_gross_income, worldwideGrossIncome),
        0,
      )
      : 0;
    const vehicleInterestByCountry = [...vehicleInterestAllocations]
      .filter(([key]) => key.startsWith(`${category}|`))
      .map(([key, amount]) => ({
        irsCountryCode: key.split("|")[1],
        amount,
      }));
    const vehicleInterestDeduction = vehicleInterestByCountry.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const foreignTaxableIncome = includedForeignIncome -
      directlyAllocableDeductions - explicitApportioned - automaticApportioned -
      vehicleInterestDeduction;
    return {
      category,
      items: matching,
      foreignTaxPaid,
      foreignTaxReduction,
      foreignGrossIncome,
      includedForeignIncome,
      directlyAllocableDeductions,
      explicitlyApportionedDeductions: explicitApportioned,
      automaticallyApportionedDeductions: automaticApportioned,
      vehicleInterestByCountry,
      foreignTaxableIncome,
    };
  });
}

function allocateVehicleInterest(
  input: Form1116Input,
): Map<string, number> {
  const interest = input.qualified_vehicle_loan_interest_deduction ?? 0;
  if (interest === 0) return new Map();
  const source = input.vehicle_interest_asset_method;
  if (!source) {
    throw new Error(
      "Form 1116 vehicle-loan interest needs a complete documented asset-method inventory for line 4b",
    );
  }
  const ids = new Set<string>();
  const eligibleCountries = new Set((input.foreign_tax_items ?? []).map(
    (item) => `${item.income_category}|${item.irs_country_code ?? ""}`,
  ));
  const allocations = new Map<string, number>();
  let worldwideAssetValue = 0;
  for (const asset of source.assets) {
    if (ids.has(asset.asset_id)) {
      throw new Error(
        "Form 1116 vehicle-interest asset inventory has a duplicate asset",
      );
    }
    ids.add(asset.asset_id);
    const averageValue = (asset.beginning_tax_book_value +
      asset.ending_tax_book_value) / 2;
    worldwideAssetValue += averageValue;
    if (asset.income_source === "us") {
      if (asset.income_category || asset.irs_country_code) {
        throw new Error(
          "Form 1116 U.S. asset cannot carry a foreign category or country",
        );
      }
      continue;
    }
    if (!asset.income_category || !asset.irs_country_code) {
      throw new Error("Form 1116 foreign asset needs its category and country");
    }
    const key = `${asset.income_category}|${asset.irs_country_code}`;
    if (!eligibleCountries.has(key)) {
      throw new Error(
        "Form 1116 vehicle-interest asset category and country must match a foreign-tax source",
      );
    }
    allocations.set(key, (allocations.get(key) ?? 0) + averageValue);
  }
  if (worldwideAssetValue <= 0) {
    throw new Error("Form 1116 vehicle-interest asset inventory has no value");
  }
  return new Map([...allocations].map(([key, value]) => [
    key,
    interest * value / worldwideAssetValue,
  ]));
}

function fraction(
  foreignTaxableIncome: number,
  worldwideTaxableIncome: number,
): number {
  if (worldwideTaxableIncome <= 0) return 0;
  return Math.round(
    Math.min(1, Math.max(0, foreignTaxableIncome / worldwideTaxableIncome)) *
      100_000,
  ) / 100_000;
}

function allowedCredit(
  category: Omit<CategorySummary, "allowedCredit" | "currentYearExcessTax">,
  line20UsTax: number,
  line18WorldwideTaxableIncome: number,
): number {
  const limit = line20UsTax *
    fraction(category.foreignTaxableIncome, line18WorldwideTaxableIncome);
  return Math.min(
    Math.round(category.foreignTaxPaid - (category.foreignTaxReduction ?? 0)),
    Math.round(limit),
  );
}

function allowedAmtCredit(
  category: Omit<CategorySummary, "allowedCredit" | "currentYearExcessTax">,
  input: Form1116Input,
): number {
  if (
    input.tentative_minimum_tax === undefined ||
    input.worldwide_taxable_income === undefined
  ) {
    return 0;
  }
  const limit = input.tentative_minimum_tax *
    fraction(category.foreignTaxableIncome, input.worldwide_taxable_income);
  return Math.min(
    Math.round(category.foreignTaxPaid - (category.foreignTaxReduction ?? 0)),
    Math.round(limit),
  );
}

function reviewedZeroCarryback(
  category: IncomeCategory,
  reviews: readonly CarryoverReview[],
): CarryoverReview {
  const matching = reviews.filter((review) =>
    review.income_category === category
  );
  if (matching.length !== 1) {
    throw new Error(
      `Form 1116 ${category} excess foreign tax needs one sourced prior-year carryback and carryover review`,
    );
  }
  const review = matching[0];
  if (
    review.prior_year_form1116_line24_allowed_credit >
      review.prior_year_form1116_line23_limit
  ) {
    throw new Error(
      `Form 1116 ${category} prior-year line 24 cannot exceed line 23`,
    );
  }
  if (
    review.prior_year_form1116_line23_limit >
      review.prior_year_form1116_line24_allowed_credit
  ) {
    throw new Error(
      `Form 1116 ${category} prior year has unused limitation, so the one-year carryback must be determined`,
    );
  }
  return review;
}

class Form1116Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_1116";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251, f1040]);

  compute(_ctx: NodeContext, rawInput: Form1116Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if ((input.foreign_tax_redeterminations?.length ?? 0) > 0) {
      throw new Error(
        "Form 1116 foreign tax redetermination needs native Schedule C and amended-year handling",
      );
    }
    for (const item of input.foreign_tax_items ?? []) {
      if (
        item.alternative_compensation_sourcing &&
        item.income_category !== IncomeCategory.General
      ) {
        throw new Error(
          "Form 1116 alternative employee compensation sourcing belongs in the general category",
        );
      }
      if (
        item.alternative_compensation_sourcing &&
        Math.round(
            item.alternative_compensation_sourcing
              .alternative_foreign_source_usd * 100,
          ) !== Math.round(item.foreign_gross_income * 100)
      ) {
        throw new Error(
          "Form 1116 line 1b alternative foreign-service amount must equal line 1a gross income",
        );
      }
      if (
        item.income_category !== IncomeCategory.Passive &&
        item.income_category !== IncomeCategory.General
      ) {
        throw new Error(
          `Form 1116 ${item.income_category} category needs category-specific source facts and calculation before its credit can be claimed`,
        );
      }
    }
    if ((input.foreign_tax_items?.length ?? 0) === 0) {
      if ((input.prior_year_carryovers?.length ?? 0) > 0) {
        throw new Error(
          "Form 1116 prior-year carryover needs current-year foreign-source income and limitation facts",
        );
      }
      return { outputs: [] };
    }
    const vehicleInterestAllocations = allocateVehicleInterest(input);
    const totals = categoryTotals(
      input.foreign_tax_items ?? [],
      input.worldwide_gross_income ?? 0,
      input.general_deductions ?? 0,
      vehicleInterestAllocations,
    );
    if (totals.length === 0) return { outputs: [] };
    const priorCarryovers = input.prior_year_carryovers ?? [];
    if (priorCarryovers.length > 0) {
      if (
        priorCarryovers.length !== 1 || totals.length !== 1 ||
        priorCarryovers[0].income_category !== totals[0].category
      ) {
        throw new Error(
          "Form 1116 prior-year carryover needs one matching passive or general income category",
        );
      }
      if (
        (input.tentative_minimum_tax ?? 0) > 0 ||
        totals[0].items.some((item) => (item.excluded_income ?? 0) > 0)
      ) {
        throw new Error(
          "Form 1116 prior-year carryover with AMT or excluded income needs separate limitation rules",
        );
      }
    }
    if (
      input.worldwide_taxable_income === undefined ||
      input.us_tax_before_credits === undefined
    ) {
      throw new Error(
        "Form 1116 needs the sourced Form 1040 taxable-income and line 16 amounts",
      );
    }
    // The selected deduction path supplies signed Form 1040 lines 11b minus
    // 14. Add Schedule 1-A line 37, then floor the total as line 18 directs.
    const signedLine18Base = input.worldwide_taxable_income +
      (input.enhanced_senior_deduction ?? 0);
    let line18WorldwideTaxableIncome = Math.max(0, signedLine18Base);
    const rateFacts = input.regular_tax_preference_facts;
    if (
      rateFacts &&
      (rateFacts.qualified_dividends > 0 || rateFacts.net_capital_gain > 0)
    ) {
      if ((input.known_foreign_qualified_dividends ?? 0) > 0) {
        throw new Error(
          "Form 1116 foreign qualified dividends need the foreign-source rate-adjustment worksheet",
        );
      }
      if (!input.foreign_preferential_income_review) {
        throw new Error(
          "Form 1116 preferential line 18 needs a documented review of foreign qualified dividends and capital gains",
        );
      }
      if (
        rateFacts.special_rate_gain > 0 ||
        rateFacts.form4952_election > 0
      ) {
        throw new Error(
          "Form 1116 Schedule D Tax Worksheet preferential adjustment is not yet supported",
        );
      }
      if (
        rateFacts.foreign_earned_income_exclusion > 0 ||
        rateFacts.form8615_applies ||
        (input.tentative_minimum_tax ?? 0) > 0
      ) {
        throw new Error(
          "Form 1116 preferential line 18 with AMT, Form 2555, or Form 8615 needs separate limitation rules",
        );
      }
      line18WorldwideTaxableIncome = adjustedQualifiedDividendLine18(
        signedLine18Base,
        rateFacts,
      );
    }

    const line20UsTax = input.us_tax_before_credits;
    const categories: CategorySummary[] = totals.map((category) => {
      const currentYearCredit = allowedCredit(
        category,
        line20UsTax,
        line18WorldwideTaxableIncome,
      );
      const priorYearCarryover = priorCarryovers[0];
      const priorYearAmount = priorYearCarryover
        ?.prior_year_schedule_b_line8_total ?? 0;
      const categoryLimit = Math.round(
        line20UsTax *
          fraction(category.foreignTaxableIncome, line18WorldwideTaxableIncome),
      );
      const usedPriorYearCarryover = Math.min(
        priorYearAmount,
        Math.max(0, categoryLimit - currentYearCredit),
      );
      return {
        ...category,
        allowedCredit: currentYearCredit + usedPriorYearCarryover,
        currentYearExcessTax: Math.max(
          0,
          Math.round(
            category.foreignTaxPaid - (category.foreignTaxReduction ?? 0),
          ) -
            currentYearCredit,
        ),
        ...(priorYearCarryover
          ? {
            priorYearCarryover: priorYearAmount,
            usedPriorYearCarryover,
          }
          : {}),
      };
    });
    const excessCategories = categories.filter((category) =>
      category.currentYearExcessTax > 0
    );
    if (excessCategories.length > 1) {
      throw new Error(
        "Form 1116 current-year carryover with multiple income categories needs separate category reconciliation",
      );
    }
    if (
      priorCarryovers.length > 0 && excessCategories.length > 0 &&
      (excessCategories.length !== 1 ||
        excessCategories[0].category !== priorCarryovers[0].income_category ||
        (excessCategories[0].usedPriorYearCarryover ?? 0) !== 0)
    ) {
      throw new Error(
        "Form 1116 prior-year carryover with current-year excess tax needs one category and zero prior-year use",
      );
    }
    const carryoverReview = excessCategories.length === 1
      ? reviewedZeroCarryback(
        excessCategories[0].category,
        input.carryover_reviews ?? [],
      )
      : undefined;
    if (
      carryoverReview &&
      carryoverReview.prior_year_schedule_b_line8_balance !==
        (priorCarryovers[0]?.prior_year_schedule_b_line8_total ?? 0)
    ) {
      throw new Error(
        "Form 1116 current excess carryback review must reconcile the filed prior-year Schedule B balance",
      );
    }

    const summedCredit = categories.reduce(
      (sum, category) => sum + category.allowedCredit,
      0,
    );
    const credit = Math.min(summedCredit, input.us_tax_before_credits ?? 0);
    const amtCredit = categories.reduce(
      (sum, category) => sum + allowedAmtCredit(category, input),
      0,
    );
    const foreignTaxPaid = categories.reduce(
      (sum, category) => sum + category.foreignTaxPaid,
      0,
    );
    const foreignIncome = categories.reduce(
      (sum, category) => sum + category.foreignGrossIncome,
      0,
    );
    const outputs: NodeOutput[] = [];
    outputs.push(output(f1040, {
      form1116_line18_worldwide_taxable_income: line18WorldwideTaxableIncome,
      form1116_line18_preferential_adjustment: Math.max(
        0,
        Math.round(signedLine18Base) - line18WorldwideTaxableIncome,
      ),
      form1116_line20_us_tax: input.us_tax_before_credits,
    }));
    if (credit > 0) {
      outputs.push(output(schedule3, { line1_foreign_tax_credit: credit }));
      outputs.push(output(form6251, {
        schedule3_line1_foreign_tax_credit: credit,
      }));
    }
    if (amtCredit > 0) outputs.push(output(form6251, { amtftc: amtCredit }));
    outputs.push({
      nodeType: this.nodeType,
      fields: {
        foreign_tax_paid: foreignTaxPaid,
        foreign_income: foreignIncome,
        total_income: line18WorldwideTaxableIncome,
        worldwide_gross_income: input.worldwide_gross_income,
        general_deductions: input.general_deductions,
        standard_or_itemized_deduction: input.standard_or_itemized_deduction,
        other_deductions: input.other_deductions,
        other_deductions_explanation: input.other_deductions_explanation,
        us_tax_before_credits: input.us_tax_before_credits,
        category_summaries: categories,
        single_source_pdf_review: input.single_source_pdf_review,
        regular_tax_preference_facts: input.regular_tax_preference_facts,
      },
    });
    if (carryoverReview && priorCarryovers.length === 1) {
      outputs.push({
        nodeType: "form1116_schedule_b",
        fields: {
          case: "combined_current_excess_prior_balance",
          category: excessCategories[0].category,
          current_year_excess_tax: excessCategories[0].currentYearExcessTax,
          prior_year_review: carryoverReview,
          prior_year_carryover: categories[0].priorYearCarryover,
          used_prior_year_carryover: 0,
          remaining_prior_year_carryover: categories[0].priorYearCarryover,
          prior_year_carryover_source: priorCarryovers[0],
        },
      });
    } else if (carryoverReview) {
      outputs.push({
        nodeType: "form1116_schedule_b",
        fields: {
          case: "current_year_excess",
          category: excessCategories[0].category,
          current_year_excess_tax: excessCategories[0].currentYearExcessTax,
          prior_year_review: carryoverReview,
        },
      });
    }
    if (priorCarryovers.length === 1 && !carryoverReview) {
      outputs.push({
        nodeType: "form1116_schedule_b",
        fields: {
          case: "prior_year_use",
          category: priorCarryovers[0].income_category,
          prior_year_carryover: categories[0].priorYearCarryover,
          used_prior_year_carryover: categories[0].usedPriorYearCarryover,
          remaining_prior_year_carryover:
            (categories[0].priorYearCarryover ?? 0) -
            (categories[0].usedPriorYearCarryover ?? 0),
          prior_year_carryover_source: priorCarryovers[0],
        },
      });
    }
    return { outputs };
  }
}

export const form1116 = new Form1116Node();
export { form1116 as form_1116 };
