/** IRC 72(t) Part I arithmetic. Callers establish taxable bases and exceptions. */
export function earlyDistributionAdditionalTax(
  regularBase: number,
  simpleTwoYearBase: number,
): number {
  return regularBase * 0.10 + simpleTwoYearBase * 0.25;
}
