import type { ChildCreditConfig } from "./types.ts";

/** Rev. Proc. 2025-32 §4.05 and the 2026 Schedule 8812 draft, reviewed
 * October 15, 2026. https://www.irs.gov/irb/2025-45_IRB
 * https://www.irs.gov/pub/irs-dft/f1040s8--dft.pdf
 */
export const childCredit2026: ChildCreditConfig = {
  ctcPerChild: 2_200,
  odcPerDependent: 500,
  actcMaxPerChild: 1_700,
  ctcPhaseOutThresholdMfj: 400_000,
  ctcPhaseOutThresholdOther: 200_000,
  actcEarnedIncomeFloor: 2_500,
};
