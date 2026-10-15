import { standardDeduction2026 } from "../nodes/config/2026-income.ts";
import {
  standardDeductionAmount,
  type StandardDeductionFacts,
} from "../nodes/intermediate/worksheets/deductions/standard/standard_deduction/amount.ts";
import { chooseDeductionMethod } from "../nodes/intermediate/worksheets/deductions/standard/standard_deduction/choice.ts";
import { FilingStatus } from "../nodes/types.ts";
import { roundWholeDollars } from "../whole-dollars.ts";
import { calculateDeductions2026 } from "./deductions.ts";
import { overallItemizedLimit2026 } from "./itemized-deductions.ts";

export interface QbiEvaluation2026 {
  /** Final Form 8995 line 17 or Form 8995-A line 41, not a pre-limit estimate. */
  deduction: number;
  /** Retain the selected calculation's filed lines/attachments for its owner. */
  forms: Readonly<Record<string, unknown>>;
}
/** Evaluate taxable income before QBI AND section 68 for each candidate. */
export interface QbiCalculator2026 {
  maximumDeduction: number;
  evaluate(preQbiTaxableIncome: number): QbiEvaluation2026;
}
export const noQbi2026: QbiCalculator2026 = {
  maximumDeduction: 0,
  evaluate: () => ({ deduction: 0, forms: {} }),
};
export interface DeductionResolution2026Input extends StandardDeductionFacts {
  adjustedGrossIncome: number;
  standardDeductionEligible: boolean;
  spouseItemizes?: boolean;
  electItemized?: boolean;
  /** Schedule A after every component limit/floor, BEFORE the §68 overall limit. */
  itemized?: { beforeOverallLimit: number; taxes: number };
  /** Eligible §170(p) cash only; source and substantiation checks are upstream. */
  nonitemizerCashContributions: number;
  /** §170(b)(1)(H): AGI before a net-operating-loss carryback, if applicable. */
  charitableContributionBase?: number;
  schedule1aLine44: number;
  schedule1aLine43: number;
}
function dollar(value: number, name: string, signed = false): number {
  if (!Number.isFinite(value) || (!signed && value < 0)) {
    throw new Error(
      `${name} must be finite${signed ? "" : " and nonnegative"}`,
    );
  }
  const result = roundWholeDollars(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`${name} exceeds whole-dollar range`);
  }
  return result;
}

/** Resolve both candidates together; no graph cycle or standard-based QBI estimate. */
export function resolveDeductions2026(
  raw: DeductionResolution2026Input,
  qbi: QbiCalculator2026,
) {
  if (!Object.values(FilingStatus).includes(raw.filing_status)) {
    throw new Error("Unsupported filing status");
  }
  const agi = dollar(raw.adjustedGrossIncome, "AGI", true);
  const schedule1a = dollar(raw.schedule1aLine44, "Schedule 1-A total");
  const senior = dollar(raw.schedule1aLine43, "Schedule 1-A senior deduction");
  // §170(p) removes the carryforward and 0.5% floor rules, but retains the
  // §170(b)(1)(G)(i) 60% contribution-base ceiling for current cash gifts.
  const contributionBase = dollar(
    raw.charitableContributionBase ?? agi,
    "Charitable contribution base",
    true,
  );
  if (contributionBase < agi) {
    throw new Error("Charitable contribution base cannot be below AGI");
  }
  const cash = Math.min(
    dollar(raw.nonitemizerCashContributions, "Eligible cash gifts"),
    dollar(Math.max(0, contributionBase) * 0.6, "Cash contribution-base limit"),
  );
  const beforeLimit = dollar(
    raw.itemized?.beforeOverallLimit ?? 0,
    "Schedule A pre-limit total",
  );
  const itemizedTaxes = dollar(raw.itemized?.taxes ?? 0, "Schedule A taxes");
  if (senior > schedule1a) {
    throw new Error("Schedule 1-A line 43 exceeds line 44");
  }
  if (itemizedTaxes > beforeLimit) {
    throw new Error("Schedule A taxes exceed pre-limit deductions");
  }
  if (raw.spouseItemizes && raw.filing_status !== FilingStatus.MFS) {
    throw new Error("Spouse itemizing requires MFS");
  }
  const standardAllowed = raw.standardDeductionEligible && !raw.spouseItemizes;
  if ((!standardAllowed || raw.electItemized) && raw.itemized === undefined) {
    throw new Error(
      "Required itemization needs an explicit finalized Schedule A, including zero",
    );
  }
  if (!Number.isSafeInteger(qbi.maximumDeduction) || qbi.maximumDeduction < 0) {
    throw new Error("QBI calculator needs a finite whole-dollar upper bound");
  }
  const evaluate = (income: number) => {
    const result = qbi.evaluate(income);
    if (
      !Number.isSafeInteger(result.deduction) || result.deduction < 0 ||
      result.deduction > qbi.maximumDeduction
    ) {
      throw new Error("QBI result is outside its whole-dollar bound");
    }
    return result;
  };
  const candidate = (
    method: "standard" | "itemized",
    deduction: number,
    qbiResult: QbiEvaluation2026,
  ) => {
    const lines = calculateDeductions2026({
      filingStatus: raw.filing_status,
      adjustedGrossIncome: agi,
      method,
      standardDeduction: method === "standard" ? deduction : 0,
      itemizedDeductions: method === "itemized" ? deduction : 0,
      nonitemizerCashContributions: cash,
      schedule1aLine44: schedule1a,
      qbiDeduction: qbiResult.deduction,
    });
    for (const [key, value] of Object.entries(lines)) {
      if (!Number.isSafeInteger(value)) {
        throw new Error(`${key} exceeds whole-dollar range`);
      }
    }
    const preQbiTaxableIncome = Math.max(
      0,
      agi - (method === "itemized" ? beforeLimit : deduction) -
        lines.line12fNonitemizerCharity - schedule1a,
    );
    return {
      method,
      ...lines,
      preQbiTaxableIncome,
      qbi: qbiResult,
      form6251Line1a: lines.line14TotalDeductions - senior,
      form6251Line1b: agi - (lines.line14TotalDeductions - senior),
      form6251Line2a: method === "standard" ? deduction : itemizedTaxes,
    };
  };
  let standard: ReturnType<typeof candidate> | undefined;
  if (standardAllowed) {
    const amount = dollar(
      standardDeductionAmount(raw, standardDeduction2026),
      "Standard deduction",
    );
    const charity = Math.min(
      cash,
      raw.filing_status === FilingStatus.MFJ ? 2_000 : 1_000,
    );
    standard = candidate(
      "standard",
      amount,
      evaluate(Math.max(0, agi - amount - charity - schedule1a)),
    );
  }
  const itemizedAt = (qbiDeduction: number) =>
    overallItemizedLimit2026({
      filingStatus: raw.filing_status,
      adjustedGrossIncome: agi,
      schedule1aDeduction: schedule1a,
      qbiDeduction,
      itemizedBeforeOverallLimit: beforeLimit,
    });
  // IRC 199A(e)(1), as amended by P.L. 119-21 section 70111(b),
  // excludes section 68 when computing QBI taxable income. Calculate QBI
  // from unreduced Schedule A once, then apply section 68 using that QBI.
  // There is no circular dependency or whole-dollar fixed-point search.
  const itemizedQbi = evaluate(Math.max(0, agi - beforeLimit - schedule1a));
  const itemizedLimit = itemizedAt(itemizedQbi.deduction);
  const itemized = candidate(
    "itemized",
    itemizedLimit.allowedItemizedDeductions,
    itemizedQbi,
  );
  const choice = chooseDeductionMethod({
    standardTotal: standard?.line14TotalDeductions,
    itemizedTotal: itemized.line14TotalDeductions,
    spouseItemizes: raw.spouseItemizes === true,
    electItemized: raw.electItemized === true,
  });
  const selected = choice.method === "standard" ? standard! : itemized;
  // Replay the chosen owner once to enforce deterministic amount calculation.
  if (
    evaluate(selected.preQbiTaxableIncome).deduction !== selected.qbi.deduction
  ) {
    throw new Error("QBI calculation did not reproduce the selected deduction");
  }
  return {
    standard,
    itemized,
    itemizedLimit,
    selected,
    reason: choice.reason,
    itemizedEvaluations: 1,
  };
}
