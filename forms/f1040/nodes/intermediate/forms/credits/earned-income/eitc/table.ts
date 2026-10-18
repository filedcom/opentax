import type { EitcParameters } from "../../../../../config/types.ts";

const BAND_WIDTH = 50;

/**
 * The IRS EIC Table for one year's IRC §32(b) parameters. Each $50 row is the
 * credit at the row's midpoint, rounded to the dollar: the credit rate times
 * the midpoint, or the maximum credit from the row that reaches the earned
 * income amount, less the phaseout rate times the midpoint's excess over the
 * phaseout start once the row lies wholly above that start. The row holding the completed phaseout amount is split
 * there, as the table's footnotes do: below it the credit is figured at the
 * midpoint of the remaining dollars from the unrounded maximum, and at or
 * above it no credit is allowed. This reproduces every row and footnote of
 * the published TY2025 table (see index.test.ts).
 */
export function lookupEicFromParameters(
  table: ReadonlyArray<EitcParameters>,
  amount: number,
  children: number,
  joint: boolean,
): number {
  const params = table[Math.min(children, 3)];
  const end = joint ? params.phaseoutEndMfj : params.phaseoutEnd;
  if (amount < 1 || amount >= end) return 0;
  const low = Math.floor(amount / BAND_WIDTH) * BAND_WIDTH;
  const split = low + BAND_WIDTH > end;
  const midpoint = (low + (split ? end : low + BAND_WIDTH)) / 2;
  const maximum = split
    ? params.creditRate * params.earnedIncomeAmount
    : params.maxCredit;
  const phaseIn = low + BAND_WIDTH > params.earnedIncomeAmount
    ? maximum
    : params.creditRate * midpoint;
  const phaseoutStart = joint ? params.phaseoutStartMfj : params.phaseoutStart;
  const reduction = low >= phaseoutStart
    ? params.phaseoutRate * (midpoint - phaseoutStart)
    : 0;
  const credit = phaseIn - reduction;
  return Math.max(0, Math.round(credit));
}
