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
