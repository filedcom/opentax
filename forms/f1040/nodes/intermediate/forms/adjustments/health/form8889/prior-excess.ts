import type { HsaContributionArithmetic } from "./current-contributions.ts";
/** Annual Part VII carryover and the corresponding Form 8889 deduction.
 * Source ownership, prior-year filing and line eligibility belong to callers. */
export function hsaPriorExcessWith<T>(
  prior: T,
  unusedRoom: T,
  taxableDistributions: T,
  currentExcess: T,
  math: HsaContributionArithmetic<T>,
) {
  const line45 = math.add(unusedRoom, taxableDistributions);
  const line46 = math.subtractFloorZero(prior, line45);
  return {
    line45,
    line46,
    line48: math.add(line46, currentExcess),
    priorYearDeduction: math.min(
      unusedRoom,
      math.subtractFloorZero(prior, taxableDistributions),
    ),
  };
}
export function hsaPriorExcess(
  prior: number,
  unusedRoom: number,
  taxableDistributions: number,
  currentExcess: number,
) {
  return hsaPriorExcessWith(
    prior,
    unusedRoom,
    taxableDistributions,
    currentExcess,
    {
      add: (a, b) => a + b,
      subtractFloorZero: (a, b) => Math.max(0, a - b),
      min: Math.min,
    },
  );
}
