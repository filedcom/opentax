// TY2026 deduction rules added by P.L. 119-21 (OBBBA). Each reads a config
// value that is zero for years without the rule, so a TY2025 return is
// unchanged.
import type { F1040Config } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";

/** Form 1040 line 12f, IRC §170(p): cash gifts by a non-itemizer, capped. */
export function nonitemizerCharitableDeduction(
  cfg: F1040Config,
  filingStatus: FilingStatus,
  eligibleCash: number,
): number {
  const limit = filingStatus === FilingStatus.MFJ
    ? cfg.nonitemizerCharitableLimitMfj
    : cfg.nonitemizerCharitableLimit;
  return Math.min(Math.round(Math.max(0, eligibleCash)), limit);
}

/** Taxable income where the 37% bracket starts, IRC §68(b)(1)(B). */
export function topBracketThreshold(
  cfg: F1040Config,
  filingStatus: FilingStatus,
): number {
  const brackets = filingStatus === FilingStatus.MFJ ||
      filingStatus === FilingStatus.QSS
    ? cfg.bracketsMfj
    : filingStatus === FilingStatus.HOH
    ? cfg.bracketsHoh
    : filingStatus === FilingStatus.MFS
    ? cfg.bracketsMfs
    : cfg.bracketsSingle;
  return brackets[brackets.length - 1].over;
}

/**
 * IRC §68(a) as amended by P.L. 119-21 §70111: itemized deductions are reduced
 * by 2/37 of the lesser of the deductions or the amount by which taxable
 * income plus those deductions exceeds the 37% bracket threshold. That income
 * is AGI less the Schedule 1-A and QBI deductions (draft 2026 Schedule A line
 * 18; Pub. 505 (2026) Worksheet 2-6 lines 4-10).
 */
export function overallItemizedLimitReduction(
  cfg: F1040Config,
  filingStatus: FilingStatus,
  itemized: number,
  agi: number,
  qbiDeduction: number,
  additionalDeductions: number,
): number {
  if (cfg.itemizedDeductionReductionRate === 0 || itemized <= 0) return 0;
  const excess = agi - additionalDeductions - qbiDeduction -
    topBracketThreshold(cfg, filingStatus);
  if (excess <= 0) return 0;
  return Math.round(
    Math.min(itemized, excess) * cfg.itemizedDeductionReductionRate,
  );
}
