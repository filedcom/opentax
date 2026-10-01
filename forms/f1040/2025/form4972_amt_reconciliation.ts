function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Form 4972 AMT join needs ${label}`);
  }
  return value as Record<string, unknown>;
}

function dollars(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 4972 AMT join needs ${label}`);
  }
  return value;
}

function optionalDollars(value: unknown, label: string): number {
  return value === undefined ? 0 : dollars(value, label);
}

/**
 * Form 6251 (2025) line 10 removes the Form 4972 special tax from Form 1040
 * line 16. Schedule J has its own tax-refiguring rule, so its line 10 must be
 * checked against that separate source; the exact special-tax identity still
 * applies here.
 */
export function assertForm4972AmtJoin(
  specialTax: number,
  pending: Readonly<Record<string, unknown>>,
): void {
  if (!Number.isInteger(specialTax) || specialTax <= 0) {
    throw new Error("Form 4972 AMT join needs positive computed special tax");
  }
  const form1040 = record(pending.f1040, "finalized Form 1040");
  const line16 = dollars(form1040.line16_income_tax, "Form 1040 line 16");
  if (form1040.form4972_tax !== specialTax || line16 < specialTax) {
    throw new Error("Form 4972 special tax differs from Form 1040 line 16");
  }
  // Form 6251 can be calculated without an attached document. When present,
  // its retained source tax and filed line 10 must both reconcile.
  if (pending.form6251 === undefined) return;
  const form6251 = record(pending.form6251, "calculated Form 6251");
  const line10 = dollars(form6251.regular_tax, "Form 6251 line 10");
  if (form6251.form4972_tax !== specialTax) {
    throw new Error("Form 6251 omits the Form 4972 special tax source");
  }
  if (pending.schedule_j !== undefined) return;
  const expected = Math.max(
    0,
    line16 - specialTax +
      optionalDollars(form6251.schedule2_line1z_tax, "Schedule 2 line 1z") -
      optionalDollars(
        form6251.schedule3_line1_foreign_tax_credit,
        "Schedule 3 line 1",
      ) -
      optionalDollars(form6251.form8978_negative_line14, "Form 8978 line 14"),
  );
  if (line10 !== expected) {
    throw new Error("Form 6251 line 10 differs from Form 4972 and Form 1040");
  }
}
