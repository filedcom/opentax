// Schedule A rules added for TY2026 by P.L. 119-21 (OBBBA). Each is gated by
// a config value that is off for TY2025.
import type { F1040Config } from "../../../../config/index.ts";
import { FilingStatus } from "../../../../types.ts";

// IRC §163(h)(3)(E)(ii); not indexed.
const MIP_PHASEOUT_AGI = 100_000;
const MIP_PHASEOUT_AGI_MFS = 50_000;
const MIP_PHASEOUT_STEP = 1_000;
const MIP_PHASEOUT_STEP_MFS = 500;
const MIP_REDUCTION_PER_STEP = 0.10;

/**
 * Schedule A line 8d. Premiums are reduced by 10% for each $1,000 ($500 MFS)
 * or fraction of AGI over $100,000 ($50,000 MFS), IRC §163(h)(3)(E)(ii); MeF
 * rules SA-F1040-011-03 and -012-02 (2026v1.0) require zero above $109,000
 * ($54,500 MFS).
 */
export function mortgageInsurancePremiumDeduction(
  cfg: F1040Config,
  filingStatus: FilingStatus | undefined,
  agi: number,
  premiums: number,
): number {
  if (premiums <= 0) return 0;
  if (!cfg.mortgageInsurancePremiumsDeductible) {
    throw new Error(
      "Mortgage insurance premiums are not deductible for this tax year (IRC §163(h)(3)(E)(iv))",
    );
  }
  const mfs = filingStatus === FilingStatus.MFS;
  const excess = Math.max(
    0,
    Math.round(agi) - (mfs ? MIP_PHASEOUT_AGI_MFS : MIP_PHASEOUT_AGI),
  );
  const steps = Math.ceil(
    excess / (mfs ? MIP_PHASEOUT_STEP_MFS : MIP_PHASEOUT_STEP),
  );
  const allowedShare = Math.max(0, 1 - steps * MIP_REDUCTION_PER_STEP);
  return Math.round(Math.round(premiums) * allowedShare);
}

/**
 * IRC §170(b)(1)(I) (P.L. 119-21 §70425): an itemizer deducts charitable
 * contributions only above 0.5% of the contribution base (AGI). Pub. 505
 * (2026) Worksheet 2-5 lines 3-6.
 */
export function charitableFloorAmount(
  cfg: F1040Config,
  agi: number,
  contributions: number,
): number {
  if (cfg.charitableAgiFloorRate === 0 || contributions <= 0) return 0;
  return Math.min(
    contributions,
    Math.round(Math.max(0, agi) * cfg.charitableAgiFloorRate),
  );
}
