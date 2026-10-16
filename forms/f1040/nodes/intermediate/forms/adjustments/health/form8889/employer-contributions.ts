/** Form 8889 Employer Contribution Worksheet. The source adapter supplies the
 * actual tax years: code W is calendar-year payroll, not contribution tax year. */
export function hsaEmployerContributionsForYear(
  codeW: number,
  paidCurrentForPrior: number,
  paidFollowingForCurrent: number,
): number {
  if (paidCurrentForPrior > codeW) {
    throw new Error(
      "Form 8889 prior-year employer contributions exceed W-2 box 12 code W",
    );
  }
  return codeW - paidCurrentForPrior + paidFollowingForCurrent;
}
