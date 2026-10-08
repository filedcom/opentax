import {
  inputSchema as standardDeductionInputSchema,
  standardAmountFor2025,
} from "../../../../nodes/intermediate/worksheets/standard_deduction/index.ts";

/** Reconcile an explicit Schedule A election with the filed deduction choice. */
export function itemizeBelowStandardElection(
  forceItemized: unknown,
  standardSource: unknown,
  filedItemized: unknown,
): boolean {
  if (forceItemized !== true) return false;
  if (standardSource === undefined) {
    throw new Error(
      "Schedule A line 18 election needs the standard deduction comparison source",
    );
  }
  const comparison = standardDeductionInputSchema.parse(standardSource);
  if (
    comparison.force_itemized !== true ||
    typeof filedItemized !== "number" || filedItemized < 0 ||
    comparison.itemized_deductions !== filedItemized
  ) {
    throw new Error(
      "Schedule A line 18 election differs from the filed deduction choice",
    );
  }
  return filedItemized < standardAmountFor2025(comparison);
}
