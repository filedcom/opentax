import { CONFIG_BY_YEAR, type F1040Config } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";

type QbiLimits = Pick<
  F1040Config,
  "qbiThresholdSingle" | "qbiThresholdMfj" | "qbiThresholdMfs" | "qbiPhaseInRange"
>;

export function qbiYearConfig(taxYear: number): F1040Config {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  return cfg;
}

/** Form 8995-A line 21 / Schedule A line 6. */
export function qbiThreshold(
  filingStatus: FilingStatus,
  cfg: QbiLimits,
): number {
  if (filingStatus === FilingStatus.MFJ) return cfg.qbiThresholdMfj;
  if (filingStatus === FilingStatus.MFS) return cfg.qbiThresholdMfs;
  return cfg.qbiThresholdSingle;
}

/** Form 8995-A line 23 / Schedule A line 8: the joint range, halved otherwise (IRC §199A(b)(3)(B)). */
export function qbiPhaseInRange(
  filingStatus: FilingStatus,
  cfg: QbiLimits,
): number {
  return filingStatus === FilingStatus.MFJ
    ? cfg.qbiPhaseInRange
    : cfg.qbiPhaseInRange / 2;
}
