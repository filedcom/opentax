import { otherTaxItemSchema } from "../../../../../nodes/inputs/deductions/itemized/schedule_a/index.ts";

export interface OtherTaxRow {
  readonly label: string;
  readonly amount: number;
}

/** Final Schedule A line 6 source; aggregate-only intake is calculation-only. */
export function scheduleAOtherTaxRows(
  source: Record<string, unknown>,
): readonly OtherTaxRow[] {
  const total = source.line_6_other_taxes ?? 0;
  if (typeof total !== "number" || !Number.isInteger(total) || total < 0) {
    throw new Error("Schedule A line 6 needs a whole-dollar filed total");
  }
  const raw = source.line_6_other_tax_items;
  if (total === 0 && raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 2) {
    throw new Error("Schedule A line 6 needs reviewed other-tax item sources");
  }
  const rows = raw.map((item) => otherTaxItemSchema.parse(item));
  if (
    new Set(rows.map((row) => row.type)).size !== rows.length ||
    rows.reduce((sum, row) => sum + row.amount, 0) !== total
  ) {
    throw new Error(
      "Schedule A line 6 reviewed tax items differ from filed total",
    );
  }
  return rows.map((row) => ({
    label: row.type === "foreign_income_tax"
      ? "Foreign income tax"
      : "GST tax on income distributions",
    amount: row.amount,
  }));
}

export function scheduleAOtherTaxDescription(
  rows: readonly OtherTaxRow[],
): string {
  return rows.map((row) => `${row.label}: ${row.amount}`).join("; ");
}
