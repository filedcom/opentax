/** IRC 4973: the source-year caller supplies the relevant excess and December
 * 31 account value. Preserve source precision; round only at the filed line. */
export function excessContributionTax(
  excess: number,
  accountValue?: number,
): number {
  if (excess <= 0) return 0;
  if (accountValue === undefined) {
    throw new Error(
      "Form 5329 needs the December 31 account value to calculate excess-contribution tax",
    );
  }
  return Math.min(excess, accountValue) * .06;
}
