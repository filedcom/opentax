/** Year-independent Part I arithmetic, before timely returns, prior excess and
 * W-2 income-inclusion adjustments. Inputs must already be source-reconciled. */
export interface HsaContributionArithmetic<T> {
  add(a: T, b: T): T;
  subtractFloorZero(a: T, b: T): T;
  min(a: T, b: T): T;
}

export function hsaCurrentContributionsWith<T>(
  limit: T,
  personal: T,
  employer: T,
  qualifiedFunding: T,
  math: HsaContributionArithmetic<T>,
) {
  const employerAndFunding = math.add(employer, qualifiedFunding);
  const remainingPersonalLimit = math.subtractFloorZero(
    math.subtractFloorZero(limit, employer),
    qualifiedFunding,
  );
  const currentPersonalDeduction = math.min(personal, remainingPersonalLimit);
  const personalExcess = math.subtractFloorZero(
    personal,
    currentPersonalDeduction,
  );
  const employerExcess = math.subtractFloorZero(
    employer,
    math.subtractFloorZero(limit, qualifiedFunding),
  );
  const unusedPersonalLimit = math.subtractFloorZero(
    remainingPersonalLimit,
    personal,
  );
  return {
    employerAndFunding,
    remainingPersonalLimit,
    currentPersonalDeduction,
    personalExcess,
    employerExcess,
    unusedPersonalLimit,
  };
}

/** Existing callers retain their numeric/source precision. The 2026 adapter
 * supplies exact rational arithmetic and separately replays whole-dollar lines. */
export function hsaCurrentContributions(
  limit: number,
  personal: number,
  employer: number,
  qualifiedFunding: number,
) {
  return hsaCurrentContributionsWith(
    limit,
    personal,
    employer,
    qualifiedFunding,
    {
      add: (a, b) => a + b,
      subtractFloorZero: (a, b) => Math.max(0, a - b),
      min: Math.min,
    },
  );
}
