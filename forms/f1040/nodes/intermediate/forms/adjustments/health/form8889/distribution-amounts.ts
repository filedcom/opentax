/** Shared Part II arithmetic. Callers establish source eligibility and use
 * either source cents or filed dollars consistently for all arguments. */
export function hsaTaxableDistributions(
  total: number,
  excluded: number,
  qualified: number,
): number {
  if (excluded > total) {
    throw new Error("Form 8889 line 14b cannot exceed HSA distributions");
  }
  const net = total - excluded;
  if (qualified > net) {
    throw new Error(
      "Form 8889 line 15 qualified expenses cannot exceed net HSA distributions",
    );
  }
  if (total <= 0) return 0;
  return net - qualified;
}

export function hsaDistributionAdditionalTax(
  taxable: number,
  excepted: number,
  rate: number,
): number {
  if (excepted > taxable) {
    throw new Error(
      "Form 8889 additional-tax exception amount cannot exceed taxable distributions",
    );
  }
  return (taxable - excepted) * rate;
}
