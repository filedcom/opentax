import { FilingStatus } from "../nodes/types.ts";
import { incomeTax2026 } from "../nodes/config/2026-income.ts";
import { bracketsForStatus } from "../nodes/intermediate/worksheets/taxes/calculation/tax_brackets.ts";
import { roundWholeDollars } from "../whole-dollars.ts";

/** Whole-dollar Worksheet 2-6, Publication 505 (2026), lines 8–13. */
export function overallItemizedLimit2026(input: {
  filingStatus: FilingStatus;
  adjustedGrossIncome: number;
  schedule1aDeduction: number;
  qbiDeduction: number;
  itemizedBeforeOverallLimit: number;
}) {
  if (!Object.values(FilingStatus).includes(input.filingStatus)) {
    throw new Error("Unsupported filing status");
  }
  for (const [key, value] of Object.entries(input)) {
    if (key === "filingStatus") continue;
    if (
      typeof value !== "number" || !Number.isSafeInteger(value) ||
      (key !== "adjustedGrossIncome" && value < 0)
    ) {
      throw new Error(
        "Overall itemized limit requires filed whole-dollar operands",
      );
    }
  }
  const brackets = bracketsForStatus(input.filingStatus, incomeTax2026);
  const topBracketThreshold = brackets.at(-1)!.over;
  const incomeAboveThreshold = Math.max(
    0,
    input.adjustedGrossIncome - input.schedule1aDeduction - input.qbiDeduction -
      topBracketThreshold,
  );
  const reduction = roundWholeDollars(
    0.054 * Math.min(input.itemizedBeforeOverallLimit, incomeAboveThreshold),
  );
  return {
    topBracketThreshold,
    incomeAboveThreshold,
    reduction,
    allowedItemizedDeductions: input.itemizedBeforeOverallLimit - reduction,
  };
}
