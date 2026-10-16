/** Shared printed phaseout arithmetic; callers supply annual limits and choose
 * the source calculation's rounding convention. */
export function adoptionPhaseoutFraction(
  magi: number,
  start: number,
  range: number,
  decimalPlaces = 3,
) {
  if (
    !Number.isInteger(decimalPlaces) || decimalPlaces < 3 || decimalPlaces > 6
  ) {
    throw Error("Adoption phaseout requires three through six decimal places");
  }
  if (magi <= start) return 0;
  const scale = 10 ** decimalPlaces;
  return Math.round(Math.min(1, (magi - start) / range) * scale) / scale;
}
export function adoptionAmountAfterPhaseout(
  base: number,
  fraction: number,
  round = (n: number) => Math.round(n * 100) / 100,
) {
  const reduction = round(base * fraction);
  return { reduction, allowed: Math.max(0, round(base - reduction)) };
}
