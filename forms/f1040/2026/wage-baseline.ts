import { z } from "zod";
import { FilingStatus } from "../nodes/types.ts";
import {
  incomeTax2026,
  standardDeduction2026,
} from "../nodes/config/2026-income.ts";
import { standardDeductionAmount } from "../nodes/intermediate/worksheets/deductions/standard/standard_deduction/amount.ts";
import { ordinaryTaxWithConfig } from "../nodes/intermediate/worksheets/taxes/calculation/tax_worksheets.ts";

export const wageBaseline2026Schema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  // Already classified regular taxable wages; this is not full W-2 intake.
  wages: z.array(z.number().finite().nonnegative()).min(1),
}).strict();

/**
 * First TY2026 calculation seam, using the same amount/rate algorithms as 2025.
 * Assumes the base standard deduction only. No return eligibility determination,
 * credits, Schedule 1-A, other taxes, withholding or settlement is performed.
 * Uses the pinned draft 2026 Tax Table below $100,000 and annual rates above.
 */
export function calculateWageBaseline2026(raw: unknown) {
  const input = wageBaseline2026Schema.parse(raw);
  const wages = Math.round(
    input.wages.reduce((sum, amount) => sum + amount, 0),
  );
  if (!Number.isSafeInteger(wages)) {
    throw new Error("Wage total exceeds the supported whole-dollar range");
  }
  const deduction = standardDeductionAmount(input, standardDeduction2026);
  const taxableIncome = Math.max(0, wages - deduction);
  return {
    taxYear: 2026 as const,
    status: "calculation-preview" as const,
    canFile: false as const,
    method: taxableIncome < 100_000
      ? "tax-table" as const
      : "tax-computation-worksheet" as const,
    wages,
    baseStandardDeduction: deduction,
    taxableIncomeBeforeOtherDeductions: taxableIncome,
    ordinaryTaxBeforeCreditsAndOtherTaxes: ordinaryTaxWithConfig(
      taxableIncome,
      input.filing_status,
      incomeTax2026,
    ),
    limitations: [
      "Assumes eligibility for the base standard deduction; does not determine filing-status or dependent eligibility.",
      "Excludes age/blind additions, itemizing, charitable and Schedule 1-A deductions, credits, other taxes and settlement.",
      "Uses the checked 2026 draft Tax Table and Tax Computation Worksheet; final IRS revisions remain a filing gate.",
      "Not a complete return; PDF, MeF and filing validation are unavailable.",
    ],
  };
}
