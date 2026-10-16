/** Shared printed phaseout arithmetic; callers supply annual limits and choose
 * the source calculation's rounding convention. */
export function adoptionPhaseoutFraction(
  magi: number,
  start: number,
  range: number,
) {
  if (magi <= start) return 0;
  return Math.round(Math.min(1, (magi - start) / range) * 1000) / 1000;
}
export function adoptionAmountAfterPhaseout(
  base: number,
  fraction: number,
  round = (n: number) => Math.round(n * 100) / 100,
) {
  const reduction = round(base * fraction);
  return { reduction, allowed: Math.max(0, round(base - reduction)) };
}
