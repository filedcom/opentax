import { reconcileForm8864DocumentSource } from "../../../credits/business/form8864/form8864_source.ts";

/** Form 8864 line 9 must be removed from AMTI on signed Form 6251 line 3. */
export function assertForm6251Form8864Source(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const adjustment = fields.line3_form8864_income_exclusion;
  if (pending?.f8864 === undefined && adjustment === undefined) return;
  if (!pending || adjustment === undefined) {
    throw new Error("Form 6251 Form 8864 income exclusion needs its source");
  }
  const { lines } = reconcileForm8864DocumentSource(pending.f8864, pending);
  if (adjustment !== -lines.line9) {
    throw new Error(
      "Form 6251 line 3 differs from Form 8864 taxable income exclusion",
    );
  }
}
