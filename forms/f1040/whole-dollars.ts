/** Whole-dollar filing keeps the sign and rounds a 50-cent magnitude up. */
export function roundWholeDollars(value: number): number {
  const magnitude = Math.round(Math.abs(value));
  return value < 0 && magnitude !== 0 ? -magnitude : magnitude;
}
