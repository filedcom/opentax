import { FilingStatus } from "../nodes/types.ts";
import { roundWholeDollars } from "../whole-dollars.ts";

/**
 * TY2026 Form 1040 lines 12e–15.
 * Sources: draft 2026 Form 1040, lines 12e–15; IRC §170(p) as described in
 * IRS Topic 506. The source PDFs are pinned in docs/ty2026/corpus/manifest.json.
 */
export interface Deductions2026Input {
  readonly filingStatus: FilingStatus;
  readonly adjustedGrossIncome: number;
  readonly method: "standard" | "itemized";
  readonly standardDeduction: number;
  readonly itemizedDeductions: number;
  /** Eligible cash contributions for a taxpayer taking the standard deduction. */
  readonly nonitemizerCashContributions: number;
  readonly schedule1aLine44: number;
  readonly qbiDeduction: number;
}

export interface Deductions2026 {
  readonly line12eStandardOrItemized: number;
  readonly line12fNonitemizerCharity: number;
  readonly line13aSchedule1a: number;
  readonly line13bQbi: number;
  readonly line14TotalDeductions: number;
  readonly line15TaxableIncome: number;
}

export function calculateDeductions2026(
  input: Deductions2026Input,
): Deductions2026 {
  if (!Number.isFinite(input.adjustedGrossIncome)) {
    throw new RangeError("adjustedGrossIncome must be finite");
  }
  for (
    const name of [
      "standardDeduction",
      "itemizedDeductions",
      "nonitemizerCashContributions",
      "schedule1aLine44",
      "qbiDeduction",
    ] as const
  ) {
    const value = input[name];
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite nonnegative amount`);
    }
  }
  if (input.method !== "standard" && input.method !== "itemized") {
    throw new Error("TY2026 deduction method must be standard or itemized");
  }
  if (!Object.values(FilingStatus).includes(input.filingStatus)) {
    throw new Error("TY2026 deduction needs a supported filing status");
  }
  const line12eStandardOrItemized = input.method === "standard"
    ? roundWholeDollars(input.standardDeduction)
    : roundWholeDollars(input.itemizedDeductions);
  const cap = input.filingStatus === FilingStatus.MFJ ? 2_000 : 1_000;
  const line12fNonitemizerCharity = input.method === "standard"
    ? Math.min(roundWholeDollars(input.nonitemizerCashContributions), cap)
    : 0;
  const line13aSchedule1a = roundWholeDollars(input.schedule1aLine44);
  const line13bQbi = roundWholeDollars(input.qbiDeduction);
  const line14TotalDeductions = line12eStandardOrItemized +
    line12fNonitemizerCharity + line13aSchedule1a + line13bQbi;
  return {
    line12eStandardOrItemized,
    line12fNonitemizerCharity,
    line13aSchedule1a,
    line13bQbi,
    line14TotalDeductions,
    line15TaxableIncome: Math.max(
      0,
      roundWholeDollars(input.adjustedGrossIncome) - line14TotalDeductions,
    ),
  };
}
