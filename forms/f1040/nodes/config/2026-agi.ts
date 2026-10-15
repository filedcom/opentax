import type { AgiConfig } from "../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";

/** Rev. Proc. 2025-32 §4.29, checked October 15, 2026.
 * https://www.irs.gov/irb/2025-45_IRB
 */
export const agi2026: AgiConfig = {
  sliPhaseOutStartSingle: 85_000,
  sliPhaseOutEndSingle: 100_000,
  sliPhaseOutStartMfj: 175_000,
  sliPhaseOutEndMfj: 205_000,
};
