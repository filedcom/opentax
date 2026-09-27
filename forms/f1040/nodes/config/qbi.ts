import { FilingStatus } from "../types.ts";
import type { F1040Config } from "./types.ts";

type QbiThresholds = Pick<
  F1040Config,
  "qbiThresholdSingle" | "qbiThresholdMfs" | "qbiThresholdMfj"
>;

export function qbiThresholdForStatus(
  status: FilingStatus | string | undefined,
  thresholds: QbiThresholds,
): number {
  if (status === FilingStatus.MFJ) return thresholds.qbiThresholdMfj;
  if (status === FilingStatus.MFS) return thresholds.qbiThresholdMfs;
  return thresholds.qbiThresholdSingle;
}
