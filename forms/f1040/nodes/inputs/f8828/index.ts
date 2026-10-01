import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8828 (Rev. November 2024), used for TY2025. The original issuer
// notification supplies lines 16, 19, and 20; an interest-rate estimate does not.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value;
  },
  "Enter a valid ISO calendar date",
);
const moneySchema = z.number().finite().nonnegative();
const streetSchema = z.string().regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/).max(
  35,
);
const usAddressSchema = z.object({
  line1: streetSchema,
  line2: streetSchema.optional(),
  city: z.string().regex(/^([A-Za-z] ?)*[A-Za-z]$/).max(22),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(?:\d{4}|\d{7})?$/),
});
const sourceReference = z.string().trim().min(1);

const reviewedIssuerSchema = z.object({
  document_reference: sourceReference,
  borrower_ssn: z.string().regex(/^\d{9}$/),
  issuer_name: z.string().min(1),
  issuer_state: z.string().regex(/^[A-Z]{2}$/),
  issuer_type: z.enum(["agency", "political_subdivision"]),
  original_loan_closing_date: dateSchema,
  highest_federally_subsidized_loan_amount: moneySchema,
  federally_subsidized_amount: moneySchema,
  adjusted_qualifying_income: moneySchema,
  holding_period_percentage: z.number().int().min(0).max(100),
});

const reviewedDispositionSchema = z.object({
  document_reference: sourceReference,
  basis_record_reference: sourceReference,
  source_transaction_id: sourceReference,
  owner_ssn: z.string().regex(/^\d{9}$/),
  property_address: usAddressSchema,
  disposition_date: dateSchema,
  sales_price_of_interest: moneySchema,
  selling_expenses: moneySchema,
  adjusted_basis_of_interest: moneySchema,
  gain_included_in_gross_income: moneySchema,
  exclusion_record_reference: sourceReference.optional(),
});
const reviewedGiftSchema = z.object({
  deed_reference: sourceReference,
  valuation_reference: sourceReference,
  donee_name: z.string().trim().min(1),
  donee_relationship: z.enum(["unrelated", "relative_other_than_spouse"]),
  donee_is_spouse_or_former_spouse: z.literal(false),
  deed_date: dateSchema,
  fair_market_value_of_interest: moneySchema,
  loan_payoff_reference: sourceReference,
  loan_payoff_date: dateSchema,
  entire_taxpayer_interest_transferred: z.literal(true),
  no_consideration_confirmed: z.literal(true),
});

export const itemSchema = z.object({
  source_transaction_id: sourceReference,
  reviewed_issuer: reviewedIssuerSchema,
  reviewed_disposition: reviewedDispositionSchema,
  disposition_kind: z.enum(["sale", "gift"]),
  reviewed_gift: reviewedGiftSchema.optional(),
  property_address: usAddressSchema, // Part I, line 1; MeF USAddressType
  subsidy_type: z.enum(["tax_exempt_bond_loan", "mortgage_credit_certificate"]), // line 2
  issuer_type: z.enum(["agency", "political_subdivision"]), // line 3 MeF destination
  issuer_name: z.string().min(1), // line 3
  issuer_state: z.string().regex(/^[A-Z]{2}$/),
  original_lender_name: z.string().min(1), // line 4
  original_lender_address: usAddressSchema,
  original_loan_closing_date: dateSchema, // line 5
  disposition_date: dateSchema, // line 6
  full_repayment_date: dateSchema, // line 8; may equal disposition date
  sales_price_of_interest: moneySchema, // line 9; FMV for a gift
  selling_expenses: moneySchema, // line 10
  adjusted_basis_of_interest: moneySchema, // line 12
  adjusted_gross_income: z.number().finite(), // MAGI worksheet: Form 1040 line 11
  tax_exempt_interest: moneySchema, // MAGI worksheet addback
  home_gain_included_in_gross_income: moneySchema, // MAGI worksheet subtraction
  family_size_at_disposition: z.number().int().positive(),
  adjusted_qualifying_income: moneySchema, // issuer table, line 16
  highest_federally_subsidized_loan_amount: z.number().finite().positive(),
  issuer_federally_subsidized_amount: moneySchema, // issuer notification, line 19
  issuer_holding_period_percentage: z.number().int().min(0).max(100), // issuer table, line 20
}).superRefine((item, ctx) => {
  if (item.disposition_kind === "gift") {
    const gift = item.reviewed_gift;
    if (!gift) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewed_gift"],
        message: "Gift disposition needs deed and fair-market-value evidence",
      });
    } else if (
      gift.deed_date !== item.disposition_date ||
      gift.fair_market_value_of_interest !== item.sales_price_of_interest ||
      gift.deed_reference !== item.reviewed_disposition.document_reference ||
      gift.loan_payoff_date !== item.full_repayment_date ||
      item.selling_expenses !== 0 ||
      item.home_gain_included_in_gross_income !== 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reviewed_gift"],
        message:
          "Gift date and Form 8828 line 9 must use deed date and appraised FMV with no consideration, sale expenses, or recognized sale gain",
      });
    }
  } else if (item.reviewed_gift !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["reviewed_gift"],
      message: "Sale disposition cannot include gift evidence",
    });
  }
  const closing = parseDate(item.original_loan_closing_date);
  const sale = parseDate(item.disposition_date);
  const repayment = parseDate(item.full_repayment_date);
  if (closing < Date.UTC(1991, 0, 1)) {
    ctx.addIssue({
      code: "custom",
      path: ["original_loan_closing_date"],
      message: "Form 8828 applies only to original loans closed after 1990",
    });
  }
  if (sale <= closing) {
    ctx.addIssue({
      code: "custom",
      path: ["disposition_date"],
      message: "Disposition must follow original loan closing",
    });
  }
  if (repayment <= closing || repayment > sale) {
    ctx.addIssue({
      code: "custom",
      path: ["full_repayment_date"],
      message: "Repayment must be between closing and disposition",
    });
  }
  const gain = item.sales_price_of_interest - item.selling_expenses -
    item.adjusted_basis_of_interest;
  if (item.home_gain_included_in_gross_income > Math.max(0, gain)) {
    ctx.addIssue({
      code: "custom",
      path: ["home_gain_included_in_gross_income"],
      message: "Recognized home gain exceeds Form 8828 line 13 gain",
    });
  }
  const expectedSubsidy = item.highest_federally_subsidized_loan_amount *
    0.0625;
  if (
    Math.abs(item.issuer_federally_subsidized_amount - expectedSubsidy) > 0.5
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["issuer_federally_subsidized_amount"],
      message:
        "Issuer amount must equal 6.25% of highest federally subsidized loan",
    });
  }
  if (sale > closing && repayment > closing && repayment <= sale) {
    const expectedHolding = holdingPeriodPercentage(
      item.original_loan_closing_date,
      item.full_repayment_date,
      item.disposition_date,
    );
    if (item.issuer_holding_period_percentage !== expectedHolding) {
      ctx.addIssue({
        code: "custom",
        path: ["issuer_holding_period_percentage"],
        message:
          `Holding period percentage must be ${expectedHolding}% for these dates`,
      });
    }
  }
});

export const inputSchema = z.object({ f8828s: z.array(itemSchema).min(1) });
export type F8828Item = z.infer<typeof itemSchema>;

function parseDate(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function roundedUpYears(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const yearDelta = endYear - startYear;
  if (endMonth === startMonth && endDay === startDay) return yearDelta;
  return yearDelta +
    (endMonth > startMonth || (endMonth === startMonth && endDay > startDay)
      ? 1
      : 0);
}

function fullYearsAndMonths(start: string, end: string): {
  years: number;
  months: number;
} {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const totalMonths = (endYear - startYear) * 12 + endMonth - startMonth -
    (endDay < startDay ? 1 : 0);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

function holdingPeriodPercentage(
  closing: string,
  repayment: string,
  disposition: string,
): number {
  const saleYears = roundedUpYears(closing, disposition);
  const standard = saleYears <= 5
    ? Math.min(saleYears, 5) * 20
    : Math.max(0, 10 - saleYears) * 20;
  // Instructions, line 20 holding-period worksheet: early full repayment
  // before disposition and within the first four years.
  if (repayment === disposition || roundedUpYears(closing, repayment) > 4) {
    return standard;
  }
  const repaymentPct = roundedUpYears(closing, repayment) * 20;
  const yearsAfterRepayment = roundedUpYears(repayment, disposition);
  const subsequentPct = Math.max(0, 6 - yearsAfterRepayment) * 20;
  return Math.round(repaymentPct * subsequentPct / 100);
}

export interface F8828Lines {
  line7_full_years: number;
  line7_full_months: number;
  line9_sales_price: number;
  line10_selling_expenses: number;
  line11_amount_realized: number;
  line12_adjusted_basis: number;
  line13_gain_or_loss: number;
  line14_half_gain: number;
  line15_modified_agi: number;
  line16_adjusted_qualifying_income: number;
  line17_income_excess: number;
  line18_income_percentage: number;
  line19_federally_subsidized_amount: number;
  line20_holding_period_percentage: number;
  line21_holding_adjusted_amount: number;
  line22_recapture_amount: number;
  line23_tax: number;
}

/** Official Form 8828 lines 9-23; percentages are stored as 0-100. */
export function computeF8828Lines(item: F8828Item): F8828Lines {
  const line7 = fullYearsAndMonths(
    item.original_loan_closing_date,
    item.disposition_date,
  );
  // The IRS treats a gift outside the divorce exception as a deemed sale at
  // the fair market value of the taxpayer's interest on the deed date.
  if (item.disposition_kind === "gift" && !item.reviewed_gift) {
    throw new Error(
      "Form 8828 gift needs reviewed deed and valuation evidence",
    );
  }
  const line9_sales_price = item.disposition_kind === "gift"
    ? item.reviewed_gift!.fair_market_value_of_interest
    : item.sales_price_of_interest;
  const line11_amount_realized = line9_sales_price -
    item.selling_expenses;
  const line13_gain_or_loss = line11_amount_realized -
    item.adjusted_basis_of_interest;
  const line15_modified_agi = item.adjusted_gross_income +
    item.tax_exempt_interest - item.home_gain_included_in_gross_income;
  const line17_income_excess = line15_modified_agi -
    item.adjusted_qualifying_income;
  const line18_income_percentage = line17_income_excess <= 0
    ? 0
    : line17_income_excess >= 5_000
    ? 100
    : Math.round(line17_income_excess / 5_000 * 100);
  const line20_holding_period_percentage = holdingPeriodPercentage(
    item.original_loan_closing_date,
    item.full_repayment_date,
    item.disposition_date,
  );
  const line21_holding_adjusted_amount =
    item.issuer_federally_subsidized_amount * line20_holding_period_percentage /
    100;
  const line22_recapture_amount = line21_holding_adjusted_amount *
    line18_income_percentage / 100;
  const line14_half_gain = Math.max(0, line13_gain_or_loss * 0.5);
  return {
    line7_full_years: line7.years,
    line7_full_months: line7.months,
    line9_sales_price,
    line10_selling_expenses: item.selling_expenses,
    line11_amount_realized,
    line12_adjusted_basis: item.adjusted_basis_of_interest,
    line13_gain_or_loss,
    line14_half_gain,
    line15_modified_agi,
    line16_adjusted_qualifying_income: item.adjusted_qualifying_income,
    line17_income_excess,
    line18_income_percentage,
    line19_federally_subsidized_amount: item.issuer_federally_subsidized_amount,
    line20_holding_period_percentage,
    line21_holding_adjusted_amount,
    line22_recapture_amount,
    line23_tax: Math.min(line14_half_gain, line22_recapture_amount),
  };
}

function buildOutputs(recapture: number): NodeOutput[] {
  if (recapture <= 0) return [];
  return [{
    nodeType: schedule2.nodeType,
    fields: { line17b_mortgage_subsidy_recapture: recapture },
  }];
}

class F8828Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8828";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const totalRecapture = input.f8828s.reduce(
      (sum, item) => sum + computeF8828Lines(item).line23_tax,
      0,
    );
    return { outputs: buildOutputs(totalRecapture) };
  }
}

export const f8828 = new F8828Node();
