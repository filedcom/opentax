import { schedule2Part1Total } from "../nodes/intermediate/aggregation/schedule2/index.ts";

/** Replay final Form 1040 tax and payment subtotals before native/PDF export. */
export function assertReturnWideArithmetic(
  fields: Record<string, unknown>,
): void {
  const amount = (key: string): number | undefined => {
    const value = fields[key];
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  };
  const matches = (filed: number, expected: number): boolean =>
    Math.abs(filed - expected) < 0.01;

  const line18 = amount("line18_total_tax_before_credits");
  const line16 = amount("line16_income_tax");
  if (
    line18 !== undefined && line16 !== undefined &&
    !matches(line18, line16 + (amount("line17_additional_taxes") ?? 0))
  ) {
    throw new Error("Form 1040 line 18 differs from lines 16 and 17");
  }

  const line21 = amount("line21_credits_total");
  if (
    line21 !== undefined &&
    !matches(
      line21,
      (amount("line19_child_tax_credit") ?? 0) +
        (amount("line20_nonrefundable_credits") ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 21 differs from lines 19 and 20");
  }

  const line22 = amount("line22_tax_after_credits");
  if (
    line22 !== undefined && line18 !== undefined && line21 !== undefined &&
    !matches(line22, Math.max(0, line18 - line21))
  ) {
    throw new Error("Form 1040 line 22 differs from lines 18 and 21");
  }
  const line24 = amount("line24_total_tax");
  if (
    line24 !== undefined && line22 !== undefined &&
    !matches(line24, line22 + (amount("line23_other_taxes") ?? 0))
  ) {
    throw new Error("Form 1040 line 24 differs from lines 22 and 23");
  }

  const line25d = amount("line25d_total_withholding");
  if (
    line25d !== undefined &&
    !matches(
      line25d,
      (amount("line25a_w2_withheld") ?? 0) +
        (amount("line25b_withheld_1099") ?? 0) +
        (amount("line25c_total") ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 25d differs from lines 25a through 25c");
  }

  const line32 = amount("line32_refundable_credits_total");
  if (
    line32 !== undefined &&
    !matches(
      line32,
      (amount("line27_eitc") ?? 0) + (amount("line28_actc") ?? 0) +
        (amount("line29_refundable_aoc") ?? 0) +
        (amount("line30_refundable_adoption") ?? 0) +
        (amount("line31_additional_payments") ?? 0),
    )
  ) {
    throw new Error("Form 1040 line 32 differs from lines 27 through 31");
  }
  const line33 = amount("line33_total_payments");
  if (
    line33 !== undefined && line25d !== undefined && line32 !== undefined &&
    !matches(line33, line25d + (amount("line26_estimated_tax") ?? 0) + line32)
  ) {
    throw new Error("Form 1040 line 33 differs from withholding and payments");
  }
}

/** Match attached Schedule totals to the final return after graph execution. */
export function assertReturnScheduleJoins(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending) return;
  const amount = (row: Record<string, unknown>, key: string): number => {
    const value = row[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };
  const record = (key: string): Record<string, unknown> | undefined => {
    const value = pending[key];
    return value !== null && typeof value === "object" &&
        !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  };
  const match = (filed: number, source: number, label: string): void => {
    if (Math.abs(filed - source) >= 0.01) {
      throw new Error(`Form 1040 ${label} differs from its attached Schedule`);
    }
  };

  const schedule1 = record("schedule1");
  if (schedule1) {
    const income = schedule1.line10_total_additional_income;
    if (typeof income === "number") {
      match(amount(fields, "line8_additional_income"), income, "line 8");
    }
    const adjustments = schedule1.line26_total_adjustments;
    if (typeof adjustments === "number") {
      match(amount(fields, "line10_adjustments"), adjustments, "line 10");
    }
  }

  const schedule1a = record("schedule1a");
  if (schedule1a && typeof schedule1a.line38_total === "number") {
    match(
      amount(fields, "line13b_additional_deductions"),
      schedule1a.line38_total,
      "line 13b",
    );
  }

  const schedule2 = record("schedule2");
  if (schedule2) {
    match(
      amount(fields, "line17_additional_taxes"),
      schedule2Part1Total(schedule2),
      "line 17",
    );
  }

  const schedule3 = record("schedule3");
  if (schedule3) {
    match(
      amount(fields, "line31_additional_payments"),
      amount(schedule3, "line15_total"),
      "line 31",
    );
  }
}
