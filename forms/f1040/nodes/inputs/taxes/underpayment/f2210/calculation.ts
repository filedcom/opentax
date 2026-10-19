import { z } from "zod";
import type { Form2210RegularMethodTerms } from "../../../../config/types.ts";
import { FilingStatus } from "../../../../types.ts";

export enum EstimatedTaxQuarter {
  Q1 = "q1",
  Q2 = "q2",
  Q3 = "q3",
  Q4 = "q4",
}

/**
 * One estimated tax payment for Form 2210 Part III. A payment without a date
 * is treated as made on its quarter's due date.
 */
export const estimatedTaxPaymentSchema = z.object({
  quarter: z.nativeEnum(EstimatedTaxQuarter),
  amount: z.number().positive(),
  date: z.string().date().optional(),
});

export type EstimatedTaxPayment = z.infer<typeof estimatedTaxPaymentSchema>;

export type RegularMethodPenaltyInput = {
  readonly required_annual_payment?: number;
  readonly withholding?: number;
  readonly q1_estimated_payment?: number;
  readonly q2_estimated_payment?: number;
  readonly q3_estimated_payment?: number;
  readonly q4_estimated_payment?: number;
  /** Dated payments; used when no quarterly Part III amounts are entered. */
  readonly estimated_payments?: ReadonlyArray<EstimatedTaxPayment>;
  /** Form 2210 line 4: current year tax after refundable credits. */
  readonly current_year_tax: number;
  readonly prior_year_tax?: number;
  readonly prior_year_agi?: number;
  readonly filing_status?: FilingStatus;
  readonly underpayment_penalty?: number;
  readonly waiver_requested?: boolean;
  readonly annualized_method?: boolean;
};

type DatedAmount = { readonly amount: number; readonly date: string };

const QUARTERS = [
  EstimatedTaxQuarter.Q1,
  EstimatedTaxQuarter.Q2,
  EstimatedTaxQuarter.Q3,
  EstimatedTaxQuarter.Q4,
] as const;
// IRC §6654(d)(1)(C): 110% of prior-year tax above this prior-year AGI.
const HIGH_INCOME_AGI_THRESHOLD = 150_000;
const HIGH_INCOME_AGI_THRESHOLD_MFS = 75_000;
// IRC §6654(e)(1): no penalty when tax less withholding is under $1,000.
const MINIMUM_UNDERPAYMENT = 1_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS;
}

function highIncomeThreshold(status: FilingStatus | undefined): number {
  return status === FilingStatus.MFS
    ? HIGH_INCOME_AGI_THRESHOLD_MFS
    : HIGH_INCOME_AGI_THRESHOLD;
}

/** Form 2210 line 9: the smaller of line 5 (90%) and line 8 (prior year). */
function requiredAnnualPayment(input: RegularMethodPenaltyInput): number {
  if (input.required_annual_payment !== undefined) {
    return input.required_annual_payment;
  }
  const currentYearThreshold = input.current_year_tax * 0.9;
  if (input.prior_year_tax === undefined) return currentYearThreshold;
  const priorYearRate =
    (input.prior_year_agi ?? 0) > highIncomeThreshold(input.filing_status)
      ? 1.1
      : 1;
  return Math.min(currentYearThreshold, input.prior_year_tax * priorYearRate);
}

function quarterIndex(quarter: EstimatedTaxQuarter): number {
  return QUARTERS.indexOf(quarter);
}

/** Estimated payments with dates; quarterly entries are paid on due dates. */
function datedPayments(
  input: RegularMethodPenaltyInput,
  terms: Form2210RegularMethodTerms,
): DatedAmount[] {
  const quarterly = [
    input.q1_estimated_payment,
    input.q2_estimated_payment,
    input.q3_estimated_payment,
    input.q4_estimated_payment,
  ];
  if (quarterly.some((amount) => amount !== undefined)) {
    return quarterly.map((amount, index) => ({
      amount: amount ?? 0,
      date: terms.installmentDueDates[index],
    }));
  }
  return (input.estimated_payments ?? []).map((payment) => ({
    amount: payment.amount,
    date: payment.date ??
      terms.installmentDueDates[quarterIndex(payment.quarter)],
  }));
}

/** Withholding is treated as paid one-fourth on each due date. */
function withholdingPayments(
  withholding: number,
  terms: Form2210RegularMethodTerms,
): DatedAmount[] {
  return terms.installmentDueDates.map((date) => ({
    amount: withholding / 4,
    date,
  }));
}

/** Penalty worksheet lines 3-13 for one amount underpaid from `due` to `paid`. */
function periodPenalty(
  amount: number,
  due: string,
  paid: string,
  terms: Form2210RegularMethodTerms,
): number {
  const start = dayNumber(due);
  const end = dayNumber(paid);
  let periodStart = -Infinity;
  let penalty = 0;
  for (const period of terms.ratePeriods) {
    const periodEnd = dayNumber(period.through);
    const days = Math.max(
      0,
      Math.min(end, periodEnd) - Math.max(start, periodStart),
    );
    penalty += amount * period.rate * (days / 365);
    periodStart = periodEnd;
  }
  return penalty;
}

/** The date a payment applied to a column counts as made. */
function appliedDate(
  paymentDate: string,
  column: number,
  terms: Form2210RegularMethodTerms,
): string {
  const due = terms.installmentDueDates[column];
  return paymentDate <= terms.timelyThrough[column] ? due : paymentDate;
}

/**
 * Part III Section A applies each payment first to the earliest unpaid
 * installment, carrying any excess to the next column with the same date;
 * Section B charges each underpaid amount from its due date until paid or
 * the return due date.
 */
function worksheetPenalty(
  installment: number,
  payments: ReadonlyArray<DatedAmount>,
  terms: Form2210RegularMethodTerms,
): number {
  const ordered = [...payments]
    .filter((payment) => payment.amount > 0)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const returnDueDate = terms.ratePeriods[terms.ratePeriods.length - 1].through;
  const unpaid = terms.installmentDueDates.map(() => installment);
  let penalty = 0;
  for (const payment of ordered) {
    let remaining = payment.amount;
    for (let column = 0; column < unpaid.length && remaining > 0; column++) {
      const applied = Math.min(unpaid[column], remaining);
      if (applied <= 0) continue;
      penalty += periodPenalty(
        applied,
        terms.installmentDueDates[column],
        appliedDate(payment.date, column, terms),
        terms,
      );
      unpaid[column] -= applied;
      remaining -= applied;
    }
  }
  return unpaid.reduce(
    (total, amount, column) =>
      total +
      periodPenalty(
        amount,
        terms.installmentDueDates[column],
        returnDueDate,
        terms,
      ),
    penalty,
  );
}

/**
 * Computes the regular-method penalty (Form 2210 Part III): withholding is
 * treated as paid evenly and estimated payments are applied by their dates.
 */
export function computeRegularMethodPenalty(
  input: RegularMethodPenaltyInput,
  terms: Form2210RegularMethodTerms | null,
): number {
  if (input.waiver_requested === true) return 0;
  if (input.underpayment_penalty !== undefined) {
    return input.underpayment_penalty;
  }
  if (input.annualized_method === true) return 0;

  const withholding = input.withholding ?? 0;
  if (input.current_year_tax - withholding < MINIMUM_UNDERPAYMENT) return 0;
  if (terms === null) {
    throw new Error(
      "Form 2210 regular-method due dates and rates are not published for this year",
    );
  }

  return Math.round(worksheetPenalty(
    requiredAnnualPayment(input) / 4,
    [
      ...withholdingPayments(withholding, terms),
      ...datedPayments(input, terms),
    ],
    terms,
  ));
}
