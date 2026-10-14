import { z } from "zod";

export const simplifiedAtRiskSchema = z.object({
  opening_adjusted_basis: z.number().int().nonnegative(),
  current_year_increases: z.number().int().nonnegative(),
  // Includes amounts in opening basis that are not at risk, but not the
  // current-year loss already reported in Part I.
  line9_decreases_and_exclusions: z.number().int().nonnegative(),
}).strict();

export type SimplifiedAtRiskFacts = z.infer<typeof simplifiedAtRiskSchema>;
export type AtRiskNet = {
  preliminaryNet: number;
  atRiskNet: number;
  suspended: number;
  amountAtRisk?: number;
};

export function calculateSimplifiedAtRiskLoss(
  preliminaryNet: number,
  facts: SimplifiedAtRiskFacts,
): AtRiskNet {
  if (!Number.isSafeInteger(preliminaryNet) || preliminaryNet >= 0) {
    throw new Error(
      "Form 6198 simplified computation requires a whole-dollar loss",
    );
  }
  const line8 = facts.opening_adjusted_basis + facts.current_year_increases;
  const amountAtRisk = line8 - facts.line9_decreases_and_exclusions;
  if (
    !Number.isSafeInteger(line8) || !Number.isSafeInteger(amountAtRisk) ||
    amountAtRisk < 0
  ) {
    throw new Error(
      "Form 6198 line 10a is negative or outside the whole-dollar range",
    );
  }
  const allowed = Math.min(-preliminaryNet, amountAtRisk);
  return {
    preliminaryNet,
    atRiskNet: -allowed,
    suspended: -preliminaryNet - allowed,
    amountAtRisk,
  };
}
