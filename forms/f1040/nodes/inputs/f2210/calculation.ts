export type RegularMethodPenaltyInput = {
  readonly required_annual_payment?: number;
  readonly withholding?: number;
  readonly q1_estimated_payment?: number;
  readonly q2_estimated_payment?: number;
  readonly q3_estimated_payment?: number;
  readonly q4_estimated_payment?: number;
  readonly current_year_tax: number;
  readonly prior_year_tax?: number;
  readonly prior_year_agi?: number;
  readonly underpayment_penalty?: number;
  readonly waiver_requested?: boolean;
  readonly annualized_method?: boolean;
};

const RATE = 0.07;
const HIGH_INCOME_AGI_THRESHOLD = 150_000;

const DUE_DATES = [
  Date.UTC(2025, 3, 15),
  Date.UTC(2025, 5, 15),
  Date.UTC(2025, 8, 15),
  Date.UTC(2026, 0, 15),
] as const;
const RETURN_DUE_DATE = Date.UTC(2026, 3, 15);
const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: number, to: number): number {
  return (to - from) / DAY_MS;
}

function requiredAnnualPayment(input: RegularMethodPenaltyInput): number {
  if (input.required_annual_payment !== undefined) {
    return input.required_annual_payment;
  }

  const currentYearThreshold = input.current_year_tax * 0.9;
  if (input.prior_year_tax === undefined) return currentYearThreshold;

  const priorYearRate = (input.prior_year_agi ?? 0) > HIGH_INCOME_AGI_THRESHOLD
    ? 1.1
    : 1;
  return Math.min(currentYearThreshold, input.prior_year_tax * priorYearRate);
}

/**
 * Computes the 2025 regular-method penalty with payments treated as made on
 * their quarterly due dates and withholding treated as paid evenly.
 */
export function computeRegularMethodPenalty(
  input: RegularMethodPenaltyInput,
): number {
  if (input.waiver_requested === true) return 0;
  if (input.underpayment_penalty !== undefined) {
    return input.underpayment_penalty;
  }
  if (input.annualized_method === true) return 0;

  const withholding = input.withholding ?? 0;
  if (input.current_year_tax - withholding < 1_000) return 0;

  const installment = requiredAnnualPayment(input) / 4;
  const quarterlyPayments = [
    input.q1_estimated_payment ?? 0,
    input.q2_estimated_payment ?? 0,
    input.q3_estimated_payment ?? 0,
    input.q4_estimated_payment ?? 0,
  ];

  let outstanding = 0;
  let paymentCredit = 0;
  let penalty = 0;
  let lastDate = DUE_DATES[0];

  for (let index = 0; index < DUE_DATES.length; index++) {
    const dueDate = DUE_DATES[index];
    penalty += outstanding * RATE * (daysBetween(lastDate, dueDate) / 365);

    outstanding += installment;
    paymentCredit += withholding / 4 + quarterlyPayments[index];
    const applied = Math.min(outstanding, paymentCredit);
    outstanding -= applied;
    paymentCredit -= applied;
    lastDate = dueDate;
  }

  penalty += outstanding * RATE *
    (daysBetween(lastDate, RETURN_DUE_DATE) / 365);
  return Math.round(penalty);
}
