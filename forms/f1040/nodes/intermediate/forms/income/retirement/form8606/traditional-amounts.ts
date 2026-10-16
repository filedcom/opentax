import { roundWholeDollars } from "../../../../../../whole-dollars.ts";

/** Filed Part I multiplication shared by the reviewed annual 2025/2026 routes.
 * Inputs are already aggregated and rounded whole-dollar lines, not per-copy amounts.
 * Increase the printed ratio precision instead of silently capping a computed line.
 */
export function traditionalIraBasisAmounts(input: {
  contribution: number;
  priorBasis: number;
  postYearContribution: number;
  yearEndValue: number;
  distributions: number;
  conversions: number;
}) {
  if (
    Object.values(input).some((n) => !Number.isSafeInteger(n) || n < 0) ||
    input.postYearContribution > input.contribution
  ) {
    throw Error(
      "Form 8606 needs nonnegative filed dollars and reconciled post-year contributions",
    );
  }
  const totalBasis = input.priorBasis + input.contribution,
    currentBasis = totalBasis - input.postYearContribution,
    combined = input.yearEndValue + input.distributions + input.conversions;
  if (!Number.isSafeInteger(totalBasis) || !Number.isSafeInteger(combined)) {
    throw Error("Form 8606 totals exceed safe filed dollar range");
  }
  let ratio = 0, nontaxableConversion = 0, nontaxableDistribution = 0;
  if (combined > 0) {
    for (let decimals = 3; decimals <= 5; decimals++) {
      const scale = 10 ** decimals;
      ratio = Math.min(1, Math.round(currentBasis / combined * scale) / scale);
      nontaxableConversion = roundWholeDollars(input.conversions * ratio);
      nontaxableDistribution = roundWholeDollars(input.distributions * ratio);
      if (nontaxableConversion + nontaxableDistribution <= currentBasis) break;
    }
  }
  if (nontaxableConversion + nontaxableDistribution > currentBasis) {
    throw Error(
      "Annual Form8606 filed multiplication exceeds basis at native five-decimal precision; source basis cannot be capped",
    );
  }
  return {
    totalBasis,
    currentBasis,
    combined,
    ratio,
    nontaxableConversion,
    nontaxableDistribution,
    remainingBasis: totalBasis - nontaxableConversion - nontaxableDistribution,
    taxableDistribution: input.distributions - nontaxableDistribution,
    taxableConversion: input.conversions - nontaxableConversion,
  };
}
