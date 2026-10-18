import {
  inputSchema as standardDeductionInputSchema,
  filedStandardAmount,
} from "../../../../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";

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
    comparison.itemized_deductions === undefined ||
    comparison.itemized_deductions -
          (comparison.overall_itemized_limit_reduction ?? 0) !== filedItemized
  ) {
    throw new Error(
      "Schedule A line 18 election differs from the filed deduction choice",
    );
  }
  return filedItemized < filedStandardAmount(comparison);
}
