import { FilingStatus } from "../../../../../types.ts";

export interface SaverRateThresholds {
  rate50: number;
  rate20: number;
  rate10: number;
}

/** Annual limits are supplied by the caller; no source or eligibility defaults. */
export function saverCreditRate(
  agi: number,
  status: FilingStatus,
  single: SaverRateThresholds,
  hoh: SaverRateThresholds,
  joint: SaverRateThresholds,
): number {
  const thresholds = status === FilingStatus.MFJ
    ? joint
    : status === FilingStatus.HOH
    ? hoh
    : single;
  if (agi <= thresholds.rate50) return 0.5;
  if (agi <= thresholds.rate20) return 0.2;
  if (agi <= thresholds.rate10) return 0.1;
  return 0;
}

/** Form 8880 lines 3–6 for one already reviewed owner column. */
export function saverContributionColumn(
  line1: number,
  line2: number,
  line4: number,
  cap: number,
) {
  const line3 = line1 + line2;
  const line5 = Math.max(0, line3 - line4);
  return { line1, line2, line3, line4, line5, line6: Math.min(line5, cap) };
}
