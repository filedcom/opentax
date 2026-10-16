/** 2026 Schedule H draft instructions, August 19, 2026, and Publication 926.
 * https://www.irs.gov/pub/irs-dft/i1040sh--dft.pdf
 * https://www.irs.gov/publications/p926
 * Worksheet 2 still has CA/VI placeholders; do not infer their final rates.
 */
export const household2026 = {
  ficaCashThreshold: 3000,
  futaQuarterThreshold: 1000,
  futaWageBase: 7000,
  additionalMedicareThreshold: 200000,
  stateContributionDueDate: "2027-04-15",
  unresolvedCreditReductionStates: ["CA", "VI"] as readonly string[],
} as const;
