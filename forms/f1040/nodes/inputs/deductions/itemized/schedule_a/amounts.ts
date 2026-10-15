/** Shared arithmetic; source eligibility and year-specific policies belong to callers. */
export function medicalExpenseDeduction(expenses: number, agi: number): number {
  return Math.max(
    0,
    Math.round(expenses) - Math.round(Math.max(0, Math.round(agi)) * 0.075),
  );
}
export function reducedSaltLimit(magi: number, policy: {
  cap: number;
  threshold: number;
  floor: number;
  reductionRate: number;
  roundReduction?: boolean;
}): number {
  if (magi <= policy.threshold) return policy.cap;
  const reduction = (magi - policy.threshold) * policy.reductionRate;
  return Math.max(
    policy.floor,
    policy.cap - (policy.roundReduction ? Math.round(reduction) : reduction),
  );
}
