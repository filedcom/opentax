export function additionalMedicareTax(excess: number): number {
  // The filed inputs are whole dollars. Compute the 9/1000 rate as an exact
  // integer ratio so decimal half-dollars cannot drift below .5 in binary
  // floating point (for example, 103,500 * 0.009).
  const thousands = Math.floor(excess / 1_000);
  const remainder = excess - thousands * 1_000;
  return thousands * 9 + Math.floor((remainder * 9 + 500) / 1_000);
}

/** 1.45% of whole-dollar wages, without binary half-dollar drift. */
export function regularMedicareTax(wages: number): number {
  const units = Math.floor(wages / 10_000);
  const remainder = wages - units * 10_000;
  return units * 145 + Math.floor((remainder * 145 + 5000) / 10_000);
}
