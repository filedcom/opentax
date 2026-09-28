import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

/** Assert the source and computed form for the bounded box 9a election. */
export function reconcileForm4972MultipleRecipients(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): boolean {
  const source = f1099rSchema.safeParse(pending?.f1099r);
  const elected = source.success
    ? source.data.f1099rs.filter((item) =>
      item.exclude_4972 === true && item.no_distribution_received !== true
    )
    : [];
  const partialSource = elected.some((item) =>
    item.box9a_pct_total !== undefined && item.box9a_pct_total < 100
  );
  if (
    !partialSource && !(typeof fields.recipient_share_pct === "number" &&
      fields.recipient_share_pct < 100)
  ) return false;
  if (!source.success || elected.length !== 1) {
    throw new Error(
      "Form 4972 partial share needs exactly one elected source Form 1099-R",
    );
  }
  const item = elected[0];
  if (
    !item || item.box9a_pct_total === undefined ||
    item.box9a_pct_total <= 0 || item.box9a_pct_total >= 100 ||
    item.box9a_pct_total !== fields.recipient_share_pct ||
    item.ts !== fields.recipient ||
    item.box2a_taxable_amount !== fields.lump_sum_amount ||
    (item.box3_capital_gain ?? 0) !== (fields.capital_gain_amount ?? 0) ||
    (item.box6_nua ?? 0) !== (fields.box6_nua ?? 0) ||
    (item.box8_other ?? 0) !== (fields.annuity_actuarial_value ?? 0) ||
    (item.box8_pct_total ?? null) !== (fields.annuity_share_pct ?? null)
  ) {
    throw new Error(
      "Form 4972 partial share differs from Form 1099-R boxes 2a, 3, 6, 8 amount/percentage, or 9a",
    );
  }
  const parsed = form4972Schema.parse(fields);
  const computed = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  const form = computed.outputs.find((output) => output.nodeType === "form4972")
    ?.fields;
  if (
    !form || Array.from({ length: 25 }, (_, index) => `line${index + 6}`)
      .some((key) => form[key] !== fields[key])
  ) {
    throw new Error(
      "Form 4972 partial-share lines differ from the sourced 2025 calculation",
    );
  }
  const tax = fields.elect_10yr_averaging === true
    ? fields.line30
    : fields.line7;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (!returnFields || returnFields.form4972_tax !== tax) {
    throw new Error(
      "Form 4972 partial-share tax differs from the Form 1040 tax source",
    );
  }
  if (fields.elect_10yr_averaging !== true) {
    const ownOrdinary = computed.outputs.find((output) =>
      output.nodeType === "f1040"
    )?.fields.line5b_form4972_ordinary;
    if (
      typeof ownOrdinary !== "number" ||
      typeof returnFields.line5b_pension_taxable !== "number" ||
      returnFields.line5b_pension_taxable < ownOrdinary
    ) {
      throw new Error(
        "Form 4972 partial-share Part-II ordinary income is missing from Form 1040 line 5b",
      );
    }
  }
  return true;
}
