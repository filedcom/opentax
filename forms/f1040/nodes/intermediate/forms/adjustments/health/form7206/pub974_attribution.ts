// Publication 974 (2025), Iterative Calculation Method, Steps 3 and 5.
// Only the credit attributable to specified-premium months reduces the
// deduction for those premiums. The filed Form 8962 still includes all months.
export function attributableSpecifiedPtc(
  monthlyRows: readonly { month_code: string; allowed_credit: number }[],
  specifiedMonths: ReadonlySet<number>,
  coverageMonths: ReadonlySet<number>,
): number {
  if (monthlyRows.length !== 12 || specifiedMonths.size === 0 ||
    coverageMonths.size === 0 ||
    [...specifiedMonths].some((month) => !coverageMonths.has(month))) {
    throw new Error("Publication 974 PTC attribution needs complete monthly rows and specified coverage months");
  }
  const credits = monthlyRows.map((row) => row.allowed_credit);
  if (credits.some((credit) => !Number.isFinite(credit) || credit < 0)) {
    throw new Error("Publication 974 PTC attribution has invalid monthly credit");
  }
  const total = credits.reduce((sum, credit) => sum + credit, 0);
  if (specifiedMonths.size === 12 || specifiedMonths.size === coverageMonths.size) {
    return total;
  }
  // The worksheet caution uses actual column (e) months when the amounts
  // differ; otherwise it uses specified months / coverage months.
  const sameMonthlyCredit = credits.every((credit) => credit === credits[0]);
  if (sameMonthlyCredit) {
    return Math.round(total * 100 * specifiedMonths.size / coverageMonths.size) / 100;
  }
  return Math.round(
    [...specifiedMonths].reduce((sum, month) => sum + credits[month - 1], 0) * 100,
  ) / 100;
}
