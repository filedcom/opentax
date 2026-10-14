/** Round the magnitude of a signed dollar amount (including negative adjustments). */
export function roundCapitalAmount(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Covered, unadjusted sales can be combined on Schedule D lines 1a/8a. */
export function isDirectCapitalSale(row: {
  part: string;
  adjustment_codes?: string;
  adjustment_amount?: number;
}): boolean {
  return (row.part === "A" || row.part === "D") &&
    !(row.adjustment_codes ?? "").length &&
    row.adjustment_amount === undefined;
}

/** Form 8949 column (h) is the difference of its reported whole-dollar columns. */
export function reportedCapitalSale<
  T extends {
    part: string;
    proceeds: number;
    cost_basis: number;
    adjustment_codes?: string;
    adjustment_amount?: number;
    gain_loss: number;
  },
>(row: T): T {
  // Preserve cents until all direct sales on the Schedule D line are combined.
  if (isDirectCapitalSale(row)) return row;
  const proceeds = Math.round(row.proceeds);
  const cost_basis = Math.round(row.cost_basis);
  const adjustment_amount = row.adjustment_amount === undefined
    ? undefined
    : roundCapitalAmount(row.adjustment_amount);
  return {
    ...row,
    proceeds,
    cost_basis,
    adjustment_amount,
    gain_loss: proceeds - cost_basis + (adjustment_amount ?? 0),
  };
}
