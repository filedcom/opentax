import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

/** Reconcile the one-recipient, Part-II-only estate-tax election before filing. */
export function reconcileForm4972EstatePartII(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (
    !(fields.federal_estate_tax !== undefined &&
      fields.federal_estate_tax !== 0 &&
      fields.elect_capital_gain === true &&
      fields.elect_10yr_averaging !== true &&
      fields.elect_include_nua !== true)
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
    fields.beneficiary_distribution !== true ||
    fields.prior_beneficiary_election_after_1986 !== false ||
    fields.alternate_payee_distribution === true ||
    (fields.recipient_share_pct ?? 100) !== 100 ||
    (item.box9a_pct_total ?? 100) !== 100 ||
    item.ts !== fields.recipient ||
    item.box2a_taxable_amount !== fields.lump_sum_amount ||
    (item.box3_capital_gain ?? 0) !== fields.capital_gain_amount ||
    (item.box6_nua ?? 0) !== (fields.box6_nua ?? 0) ||
    fields.elect_include_nua === true ||
    (item.box8_other ?? 0) !== 0 ||
    (fields.annuity_actuarial_value ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4972 Part-II-only estate election needs one matching full-share beneficiary Form 1099-R without NUA or annuity allocation",
    );
  }

  const parsed = form4972Schema.parse(fields);
  const calculated = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  ).outputs;
  const form = calculated.find((output) => output.nodeType === "form4972")
    ?.fields;
  const tax = calculated.find((output) =>
    output.nodeType === "income_tax_calculation"
  )?.fields.form4972_tax;
  if (
    !form || form.line6 !== fields.line6 || form.line7 !== fields.line7 ||
    fields.line8 !== undefined || fields.line18 !== undefined ||
    fields.line30 !== undefined ||
    (pending?.f1040 as Record<string, unknown> | undefined)?.form4972_tax !==
      tax
  ) {
    throw new Error(
      "Form 4972 Part-II-only estate lines or Form 1040 tax differ from the sourced calculation",
    );
  }
}
