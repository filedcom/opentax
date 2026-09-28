import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

/** Reconcile an ordinary full-share election without NUA or estate allocation. */
export function reconcileForm4972FullShare(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (
    (fields.recipient_share_pct ?? 100) !== 100 ||
    fields.elect_include_nua === true ||
    (fields.line6_nua_capital_gain ?? 0) !== 0 ||
    (fields.line8_nua_included ?? 0) !== 0 ||
    (fields.federal_estate_tax ?? 0) !== 0
  ) return;

  const source = f1099rSchema.safeParse(pending?.f1099r);
  const elected = source.success
    ? source.data.f1099rs.filter((item) =>
      item.exclude_4972 === true && item.no_distribution_received !== true
    )
    : [];
  const item = elected[0];
  if (
    elected.length !== 1 || !item ||
    (item.box9a_pct_total ?? 100) !== 100 ||
    item.ts !== fields.recipient ||
    item.box2a_taxable_amount !== fields.lump_sum_amount ||
    (item.box3_capital_gain ?? 0) !== (fields.capital_gain_amount ?? 0) ||
    (item.box6_nua ?? 0) !== (fields.box6_nua ?? 0) ||
    (item.box8_other ?? 0) !== (fields.annuity_actuarial_value ?? 0) ||
    (item.box8_pct_total ?? null) !== (fields.annuity_share_pct ?? null)
  ) {
    throw new Error(
      "Form 4972 full-share election needs one matching elected Form 1099-R and boxes 2a, 3, 6, 8, and 9a",
    );
  }

  const computed = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    form4972Schema.parse(fields),
  ).outputs;
  const form = computed.find((output) => output.nodeType === "form4972")
    ?.fields;
  const tax = computed.find((output) =>
    output.nodeType === "income_tax_calculation"
  )?.fields.form4972_tax;
  if (
    !form || Array.from({ length: 25 }, (_, index) => `line${index + 6}`)
      .some((key) => form[key] !== fields[key])
  ) {
    throw new Error(
      "Form 4972 full-share lines differ from the elected 2025 calculation",
    );
  }
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (!returnFields || returnFields.form4972_tax !== tax) {
    throw new Error(
      "Form 4972 full-share special tax differs from the finalized Form 1040",
    );
  }
  if (fields.elect_10yr_averaging !== true) {
    const ordinary = computed.find((output) => output.nodeType === "f1040")
      ?.fields.line5b_form4972_ordinary;
    if (
      typeof ordinary !== "number" ||
      typeof returnFields.line5b_pension_taxable !== "number" ||
      returnFields.line5b_pension_taxable < ordinary
    ) {
      throw new Error(
        "Form 4972 full-share Part-II ordinary income is missing from Form 1040 line 5b",
      );
    }
  }
}
