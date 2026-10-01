import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

/** One taxpayer's two full-share distributions from the same qualified plan. */
export function reconcileForm4972Multiple1099R(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
  owner: { name: string; ssn: string } | undefined,
): void {
  const form = form4972Schema.parse(fields);
  const plan = form.multiple_1099r;
  if (!plan) throw new Error("Form 4972 two-source plan evidence is missing");
  const source = f1099rSchema.safeParse(pending?.f1099r);
  const elected = source.success
    ? source.data.f1099rs.filter((item) =>
      item.exclude_4972 === true && item.no_distribution_received !== true
    )
    : [];
  const refs = plan.source_document_references;
  if (
    !owner || owner.ssn.replaceAll("-", "") !== plan.participant_ssn ||
    owner.name.trim() !== plan.participant_name ||
    (form.recipient !== "T" && form.recipient !== "S") ||
    form.elect_10yr_averaging !== true ||
    (form.elect_capital_gain === true
      ? (form.capital_gain_amount ?? 0) <= 0
      : (form.capital_gain_amount ?? 0) !== 0) ||
    refs[0] === refs[1] ||
    elected.length !== 2 ||
    elected.some((item, index) =>
      item.ts !== form.recipient ||
      item.source_document_reference !== refs[index] ||
      item.form4972_plan?.participant_name !== plan.participant_name ||
      item.form4972_plan?.participant_ssn !== plan.participant_ssn ||
      item.form4972_plan?.plan_reference !== plan.plan_reference ||
      item.form4972_plan?.full_balance_statement_reference !==
        plan.full_balance_statement_reference ||
      item.form4972_plan?.all_qualified_distributions_included !== true ||
      item.box9a_pct_total !== 100 ||
      typeof item.box2a_taxable_amount !== "number" ||
      item.box2a_taxable_amount <= 0 ||
      (item.box6_nua ?? 0) !== 0 ||
      (item.box8_other ?? 0) !== 0 || item.box8_pct_total !== undefined
    ) ||
    elected[0]?.payer_ein !== elected[1]?.payer_ein ||
    elected[0]?.payer_name !== elected[1]?.payer_name ||
    !elected[0]?.payer_ein.trim() || !elected[0]?.payer_name.trim() ||
    elected.reduce((sum, item) => sum + (item.box2a_taxable_amount ?? 0), 0) !==
      form.lump_sum_amount ||
    elected.reduce((sum, item) => sum + (item.box3_capital_gain ?? 0), 0) !==
      (form.capital_gain_amount ?? 0) ||
    source.success &&
      source.data.f1099rs.some((item) =>
        item.exclude_4972 !== true &&
        item.form4972_plan?.plan_reference === plan.plan_reference
      )
  ) {
    throw new Error(
      "Form 4972 two-source election needs matching owner, plan, complete source copies, and summed boxes 2a and 3",
    );
  }

  const computed = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs;
  const calculated = computed.find((output) => output.nodeType === "form4972")
    ?.fields;
  const tax = computed.find((output) =>
    output.nodeType === "income_tax_calculation"
  )?.fields.form4972_tax;
  const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !calculated ||
    Array.from({ length: 25 }, (_, index) => `line${index + 6}`)
      .some((key) => calculated[key] !== fields[key]) ||
    !returnFields || returnFields.form4972_tax !== tax
  ) {
    throw new Error(
      "Form 4972 two-source calculated lines and special tax must match the finalized Form 1040",
    );
  }
}
