/** Shared Form 8889 Part III arithmetic. Eligibility, contribution-year amounts
 * and statutory exceptions must be reconciled before supplying these incomes. */
export function hsaTestingPeriodIncome(
  lastMonthIncome: number,
  fundingIncome: number,
) {
  const income = lastMonthIncome + fundingIncome;
  return { income, additionalTax: income * .1 };
}
