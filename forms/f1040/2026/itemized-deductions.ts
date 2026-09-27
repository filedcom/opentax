import { FilingStatus } from "../nodes/types.ts";
import { config2026 } from "../nodes/config/2026.ts";
import { bracketsForStatus } from "../nodes/intermediate/worksheets/tax_brackets.ts";

/**
 * IRC §170(b)(1)(I), added by P.L. 119-21 §70425: 2026 itemizers may deduct
 * otherwise allowable charitable contributions only above 0.5% of AGI.
 * The caller must first apply contribution-category percentage limits.
 * Carryforward attribution under §170(d)(1)(C) is a separate calculation.
 */
export function charitableDeductionAfterFloor2026(
  otherwiseAllowable: number,
  adjustedGrossIncome: number,
): number {
  nonnegative("otherwiseAllowable", otherwiseAllowable);
  finite("adjustedGrossIncome", adjustedGrossIncome);
  return Math.max(0, otherwiseAllowable - Math.max(0, adjustedGrossIncome) * 0.005);
}

export interface OverallItemizedLimit2026Input {
  readonly filingStatus: FilingStatus;
  readonly adjustedGrossIncome: number;
  readonly schedule1aDeduction: number;
  readonly qbiDeduction: number;
  readonly itemizedBeforeOverallLimit: number;
}

export interface OverallItemizedLimit2026 {
  readonly topBracketThreshold: number;
  readonly incomeAboveThreshold: number;
  readonly reduction: number;
  readonly allowedItemizedDeductions: number;
}

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function nonnegative(name: string, value: number): void {
  finite(name, value);
  if (value < 0) throw new RangeError(`${name} must be nonnegative`);
}

/**
 * P.L. 119-21 §68 and 2026 Publication 505 Worksheet 2-6, lines 8–13.
 * Reduce itemized deductions by 5.4% of the lesser of the pre-limit deduction
 * or AGI less Schedule 1-A and QBI deductions above the top bracket threshold.
 */
export function overallItemizedLimit2026(
  input: OverallItemizedLimit2026Input,
): OverallItemizedLimit2026 {
  finite("adjustedGrossIncome", input.adjustedGrossIncome);
  nonnegative("schedule1aDeduction", input.schedule1aDeduction);
  nonnegative("qbiDeduction", input.qbiDeduction);
  nonnegative("itemizedBeforeOverallLimit", input.itemizedBeforeOverallLimit);
  const brackets = bracketsForStatus(input.filingStatus, config2026);
  const topBracketThreshold = brackets[brackets.length - 1].over;
  const incomeAboveThreshold = Math.max(
    0,
    input.adjustedGrossIncome - input.schedule1aDeduction -
      input.qbiDeduction - topBracketThreshold,
  );
  const reduction = 0.054 * Math.min(
    input.itemizedBeforeOverallLimit,
    incomeAboveThreshold,
  );
  return {
    topBracketThreshold,
    incomeAboveThreshold,
    reduction,
    allowedItemizedDeductions: input.itemizedBeforeOverallLimit - reduction,
  };
}
