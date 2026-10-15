import { FilingStatus } from "../types.ts";

/** Rev. Proc. 2025-32 §4.10; 2026 draft Form 6251; IRC 55(d)(4).
 * P.L.119-21 §70107 substitutes 50% throughout §55(d)(2), including MFS.
 */
export const amt2026 = {
  exemption: {
    [FilingStatus.Single]: 90100,
    [FilingStatus.HOH]: 90100,
    [FilingStatus.MFJ]: 140200,
    [FilingStatus.QSS]: 140200,
    [FilingStatus.MFS]: 70100,
  },
  phaseOutStart: {
    [FilingStatus.Single]: 500000,
    [FilingStatus.HOH]: 500000,
    [FilingStatus.MFJ]: 1000000,
    [FilingStatus.QSS]: 1000000,
    [FilingStatus.MFS]: 500000,
  },
  phaseOutRate: .50,
  mfsAdditionStart: 640200,
  mfsAdditionCap: 70100,
  mfsAdditionRate: .50,
  thresholdStandard: 244500,
  thresholdMfs: 122250,
  adjustmentStandard: 4890,
  adjustmentMfs: 2445,
} as const;
