/** Shared election rule; callers supply the fully calculated annual candidates. */
export function chooseDeductionMethod(input: {
  standardTotal?: number;
  itemizedTotal: number;
  spouseItemizes: boolean;
  electItemized: boolean;
}) {
  if (input.spouseItemizes) {
    return {
      method: "itemized" as const,
      reason: "mfs_spouse_itemizes" as const,
    };
  }
  if (input.electItemized) {
    return {
      method: "itemized" as const,
      reason: "itemization_election" as const,
    };
  }
  if (input.standardTotal === undefined) {
    return {
      method: "itemized" as const,
      reason: "standard_ineligible" as const,
    };
  }
  return input.itemizedTotal > input.standardTotal
    ? { method: "itemized" as const, reason: "larger_total_deduction" as const }
    : {
      method: "standard" as const,
      reason: "standard_total_at_least_itemized" as const,
    };
}
