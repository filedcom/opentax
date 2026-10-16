import type { StandardDeductionConfig } from "../../../../../config/types.ts";
import { FilingStatus } from "../../../../../types.ts";

export type StandardDeductionFacts = {
  readonly filing_status: FilingStatus;
  readonly taxpayer_age_65_or_older?: boolean;
  readonly taxpayer_blind?: boolean;
  readonly spouse_age_65_or_older?: boolean;
  readonly spouse_blind?: boolean;
  readonly taxpayer_can_be_claimed_as_dependent?: boolean;
  readonly dependent_earned_income?: number;
};

/** Shared amount calculation; filing eligibility and itemization stay with the caller. */
export function standardDeductionAmount(
  input: StandardDeductionFacts,
  cfg: StandardDeductionConfig,
): number {
  const base = cfg.standardDeductionBase[input.filing_status];
  const additional = cfg.standardDeductionAdditional[input.filing_status];
  if (base === undefined || additional === undefined) {
    throw new Error("Unsupported filing status for standard deduction");
  }
  let factors = Number(input.taxpayer_age_65_or_older === true) +
    Number(input.taxpayer_blind === true);
  if (
    [FilingStatus.MFJ, FilingStatus.MFS, FilingStatus.QSS].includes(
      input.filing_status,
    )
  ) {
    factors += Number(input.spouse_age_65_or_older === true) +
      Number(input.spouse_blind === true);
  }
  let deduction = base;
  if (input.taxpayer_can_be_claimed_as_dependent === true) {
    if (input.dependent_earned_income === undefined) {
      throw new Error("Dependent standard deduction needs earned income");
    }
    if (
      !Number.isFinite(input.dependent_earned_income) ||
      input.dependent_earned_income < 0
    ) {
      throw new Error("Dependent earned income must be finite and nonnegative");
    }
    deduction = Math.min(
      base,
      Math.max(
        cfg.dependentMinimum,
        input.dependent_earned_income + cfg.dependentEarnedIncomeAddition,
      ),
    );
  }
  return deduction + factors * additional;
}
