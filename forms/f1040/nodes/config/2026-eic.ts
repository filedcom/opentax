import type { EicCalculationConfig } from "../intermediate/forms/credits/earned-income/eitc/index.ts";
import { lookupEic2026 } from "../intermediate/forms/credits/earned-income/eitc/table_2026.ts";

/** Rev. Proc. 2025-32 §4.06 and the published draft 2026 EIC table.
 * https://www.irs.gov/irb/2025-45_IRB
 * https://www.irs.gov/pub/irs-dft/p1040--dft.pdf
 */
export const eic2026: EicCalculationConfig = {
  taxYear: 2026,
  investmentIncomeLimit: 12_200,
  agiThresholdChildless: { other: 10_860, joint: 18_140 },
  agiThresholdWithChildren: { other: 23_890, joint: 31_160 },
  lookup: lookupEic2026,
};

export const eicPhaseoutEnds2026 = {
  other: [19_540, 51_593, 58_629, 62_974],
  joint: [26_820, 58_863, 65_899, 70_244],
} as const;
