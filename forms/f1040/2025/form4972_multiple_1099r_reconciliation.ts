import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

/** One participant's complete same-recipient distributions from one plan. */
export function reconcileForm4972Multiple1099R(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
  owner: { name: string; ssn: string } | undefined,
): void {
  const form = form4972Schema.parse(fields);
  const plan = form.multiple_1099r;
  if (!plan) throw new Error("Form 4972 multi-source plan evidence is missing");
  const source = f1099rSchema.safeParse(pending?.f1099r);
  const elected = source.success
    ? source.data.f1099rs.filter((item) =>
      item.exclude_4972 === true && item.no_distribution_received !== true
    )
    : [];
  const refs = plan.source_document_references;
  const share = form.recipient_share_pct ?? 100;
  const partialBeneficiary = share < 100;
  const annuityCopies = elected.filter((item) => (item.box8_other ?? 0) > 0);
  const annuityShare = annuityCopies[0]?.box8_pct_total;
  const nua = elected.reduce((sum, item) => sum + (item.box6_nua ?? 0), 0);
  const gain = elected.reduce(
    (sum, item) => sum + (item.box3_capital_gain ?? 0),
    0,
  );
  const taxable = elected.reduce(
    (sum, item) => sum + (item.box2a_taxable_amount ?? 0),
    0,
  );
  if (
    !owner ||
    (partialBeneficiary
      ? owner.ssn.replaceAll("-", "") === plan.participant_ssn ||
        form.beneficiary_distribution !== true ||
        form.participant_five_year_member !== false
      : owner.ssn.replaceAll("-", "") !== plan.participant_ssn ||
        owner.name.trim() !== plan.participant_name ||
        form.beneficiary_distribution !== false) ||
    (form.recipient !== "T" && form.recipient !== "S") ||
    form.elect_10yr_averaging !== true ||
    (form.elect_capital_gain === true &&
      (form.capital_gain_amount ?? 0) <= 0) ||
    new Set(refs).size !== refs.length ||
    elected.length !== refs.length ||
    elected.some((item, index) =>
      item.ts !== form.recipient ||
      item.source_document_reference !== refs[index] ||
      item.form4972_plan?.participant_name !== plan.participant_name ||
      item.form4972_plan?.participant_ssn !== plan.participant_ssn ||
      item.form4972_plan?.plan_reference !== plan.plan_reference ||
      item.form4972_plan?.full_balance_statement_reference !==
        plan.full_balance_statement_reference ||
      item.form4972_plan?.all_qualified_distributions_included !== true ||
      item.box9a_pct_total !== share ||
      (partialBeneficiary &&
        (item.box7_distribution_code !== "A" ||
          item.recipient_ssn !== owner.ssn.replaceAll("-", "") ||
          item.box1_gross_distribution !==
            (item.box2a_taxable_amount ?? 0) + (item.box6_nua ?? 0) ||
          !Number.isSafeInteger(
            (item.box2a_taxable_amount ?? 0) * 100 / share,
          ) ||
          !Number.isSafeInteger(
            (item.box3_capital_gain ?? 0) * 100 / share,
          ) ||
          !Number.isSafeInteger((item.box6_nua ?? 0) * 100 / share) ||
          ((item.box6_nua ?? 0) > 0 &&
            !Number.isSafeInteger(
              (item.box6_nua ?? 0) * (item.box3_capital_gain ?? 0) /
                (item.box2a_taxable_amount ?? 0),
            )) ||
          ((item.box8_other ?? 0) > 0 &&
            (!annuityShare || item.box8_pct_total !== annuityShare ||
              !Number.isSafeInteger(
                item.box8_other! * 100 / annuityShare,
              ))) ||
          ((item.box8_other ?? 0) === 0 &&
            item.box8_pct_total !== undefined))) ||
      typeof item.box2a_taxable_amount !== "number" ||
      item.box2a_taxable_amount <= 0 ||
      (nua > 0 &&
        (!Number.isSafeInteger(item.box2a_taxable_amount ?? 0) ||
          !Number.isSafeInteger(item.box3_capital_gain ?? 0) ||
          !Number.isSafeInteger(item.box6_nua ?? 0))) ||
      !Number.isSafeInteger(item.box8_other ?? 0) ||
      (!partialBeneficiary && item.box8_pct_total !== undefined &&
        item.box8_pct_total !== 100)
    ) ||
    elected.some((item) =>
      item.payer_ein !== elected[0]?.payer_ein ||
      item.payer_name !== elected[0]?.payer_name
    ) ||
    !elected[0]?.payer_ein.trim() || !elected[0]?.payer_name.trim() ||
    taxable !== form.lump_sum_amount ||
    gain !== (form.capital_gain_amount ?? 0) ||
    nua !== (form.box6_nua ?? 0) ||
    elected.reduce((sum, item) => sum + (item.box8_other ?? 0), 0) !==
      (form.annuity_actuarial_value ?? 0) ||
    (partialBeneficiary && (form.annuity_share_pct ?? null) !==
        (annuityShare ?? null)) ||
    (nua > 0 &&
      (form.elect_include_nua !== true ||
        form.elect_capital_gain !== true || gain <= 0 ||
        !Number.isSafeInteger(nua * gain / taxable))) ||
    (nua === 0 && form.elect_include_nua === true) ||
    source.success &&
      source.data.f1099rs.some((item) =>
        item.exclude_4972 !== true &&
        item.form4972_plan?.plan_reference === plan.plan_reference
      )
  ) {
    throw new Error(
      "Form 4972 multi-source election needs matching owner, plan, complete source copies, and summed boxes 2a, 3, and 6",
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
    calculated.line6_nua_capital_gain !== fields.line6_nua_capital_gain ||
    calculated.line8_nua_included !== fields.line8_nua_included ||
    !returnFields || returnFields.form4972_tax !== tax
  ) {
    throw new Error(
      "Form 4972 multi-source calculated lines and special tax must match the finalized Form 1040",
    );
  }
}
