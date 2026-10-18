import type { F1040Config } from "../../../../../config/index.ts";

/**
 * Sources of the aggregate QBI from active trades or businesses: Schedule C
 * businesses and the return's other QBI amounts, already netted of the
 * line 1 deductions (half SE tax, SE health insurance, retirement).
 */
export type ActiveQbiFacts = {
  readonly businesses: ReadonlyArray<{
    readonly qbi: number;
    readonly materiallyParticipates: boolean;
  }>;
  /** Form 8995 line 2: QBI for the year before any prior-year loss. */
  readonly totalQbi: number;
  readonly otherQbiSources: boolean;
};

/**
 * IRC §199A(i) (P.L. 119-21 §70105), from TY2026: the deduction is at least
 * $400 when aggregate QBI from businesses in which the taxpayer materially
 * participates (§469(h)) is at least $1,000. 2026 Form 8995 lines 15-17 and
 * its instructions for line 16. Zero config amounts (TY2025) leave the
 * deduction unchanged.
 */
export function withMinimumDeduction(
  deduction: number,
  facts: ActiveQbiFacts,
  cfg: Pick<F1040Config, "qbiMinimumDeduction" | "qbiMinimumDeductionQbiFloor">,
): number {
  const minimum = cfg.qbiMinimumDeduction;
  if (minimum <= 0 || deduction >= minimum) return deduction;
  if (facts.totalQbi < cfg.qbiMinimumDeductionQbiFloor) return deduction;
  const allActive = facts.businesses.length > 0 && !facts.otherQbiSources &&
    facts.businesses.every((business) => business.materiallyParticipates);
  if (!allActive) {
    if (
      facts.businesses.filter((business) => business.materiallyParticipates)
          .reduce((sum, business) => sum + business.qbi, 0) <
        cfg.qbiMinimumDeductionQbiFloor
    ) {
      return deduction;
    }
    throw new Error(
      "Form 8995 line 16 minimum deduction needs the QBI of each materially participating business net of its line 1 deductions",
    );
  }
  return minimum;
}
