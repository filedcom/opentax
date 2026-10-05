import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../nodes/intermediate/forms/form4972/index.ts";

// The 2025 Form 4972 NUA worksheet uses 1099-R boxes 3 / 2a × box 6.
// One elected distribution is required. Death-benefit and estate-tax
// allocations are supported for a full-share beneficiary, including a
// Part III annuity. A sourced partial-share Part-II-only estate allocation
// and Part-III-only estate allocations are also supported. A separate
// partial-share beneficiary route combines NUA with sourced death benefit
// and estate tax when both Parts II and III are elected, optionally with a
// sourced annuity amount and its separate box 8 percentage.
export function reconcileForm4972Nua(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (
    fields.elect_include_nua !== true &&
    !(typeof fields.line6_nua_capital_gain === "number" &&
      fields.line6_nua_capital_gain > 0) &&
    !(typeof fields.line8_nua_included === "number" &&
      fields.line8_nua_included > 0)
  ) return;

  // The full-share multi-copy path independently sums all three NUA worksheet
  // boxes and replays the calculation after matching each plan source.
  if (fields.multiple_1099r !== undefined) return;

  const source = f1099rSchema.safeParse(pending?.f1099r);
  if (!source.success) {
    throw new Error("Form 4972 NUA needs the source Form 1099-R");
  }
  const elected = source.data.f1099rs.filter((item) =>
    item.exclude_4972 === true && item.no_distribution_received !== true
  );
  if (elected.length !== 1) {
    throw new Error("Form 4972 NUA needs exactly one elected Form 1099-R");
  }
  const item = elected[0];
  const sharePct = item?.box9a_pct_total ?? 100;
  const hasAllocation = (typeof fields.death_benefit_exclusion === "number" &&
    fields.death_benefit_exclusion > 0) ||
    (typeof fields.federal_estate_tax === "number" &&
      fields.federal_estate_tax > 0);
  const partialDeath = sharePct < 100 &&
    typeof fields.death_benefit_exclusion === "number" &&
    fields.death_benefit_exclusion > 0;
  const partialEstate = sharePct < 100 &&
    typeof fields.federal_estate_tax === "number" &&
    fields.federal_estate_tax > 0;
  const partialNuaDeathEstatePartIII = partialDeath && partialEstate &&
    fields.elect_capital_gain === true &&
    fields.elect_10yr_averaging === true &&
    typeof fields.capital_gain_amount === "number" &&
    fields.capital_gain_amount > 0 &&
    (item?.box8_other ?? 0) === 0;
  const partialNuaDeathAnnuityEstatePartIII = partialDeath && partialEstate &&
    fields.elect_capital_gain === true &&
    fields.elect_10yr_averaging === true &&
    typeof fields.capital_gain_amount === "number" &&
    fields.capital_gain_amount > 0 &&
    (item?.box8_other ?? 0) > 0 &&
    typeof item?.box8_pct_total === "number";
  const partialNuaAnnuityEstatePartIII = partialEstate && !partialDeath &&
    (item?.box8_other ?? 0) > 0 &&
    fields.elect_10yr_averaging === true &&
    fields.elect_capital_gain !== true &&
    (fields.capital_gain_amount ?? 0) === 0 &&
    fields.death_benefit_exclusion === undefined;
  if (
    !item || item.ts !== fields.recipient ||
    sharePct <= 0 || sharePct > 100 ||
    (fields.recipient_share_pct ?? 100) !== sharePct
  ) {
    throw new Error(
      "Form 4972 NUA recipient or box 9a share differs from Form 1099-R",
    );
  }
  if (
    fields.elect_include_nua !== true ||
    (fields.elect_10yr_averaging !== true &&
      fields.elect_capital_gain !== true) ||
    (hasAllocation &&
      (fields.beneficiary_distribution !== true ||
        (sharePct !== 100 &&
          (((partialDeath && partialEstate) &&
            !partialNuaDeathEstatePartIII &&
            !partialNuaDeathAnnuityEstatePartIII) ||
            (!partialDeath && !partialEstate) ||
            ((item.box8_other ?? 0) > 0 &&
              !partialNuaAnnuityEstatePartIII &&
              !partialNuaDeathAnnuityEstatePartIII) ||
            (partialEstate && fields.elect_capital_gain === true &&
              fields.elect_10yr_averaging === true &&
              (typeof fields.capital_gain_amount !== "number" ||
                fields.capital_gain_amount <= 0)) ||
            item.box1_gross_distribution !==
              (item.box2a_taxable_amount ?? 0) + (item.box6_nua ?? 0))) ||
        ((item.box8_other ?? 0) > 0 &&
          fields.elect_10yr_averaging !== true))) ||
    (item.box8_other ?? 0) !== (fields.annuity_actuarial_value ?? 0) ||
    ((item.box8_other ?? 0) > 0 &&
      fields.elect_10yr_averaging !== true)
  ) {
    throw new Error(
      "Form 4972 NUA requires a sourced Part II or III; combined partial-share death-benefit, estate, and annuity adjustments require both elections and a sourced box 8 percentage",
    );
  }
  if (
    (item.box8_other ?? 0) > 0 &&
    ((sharePct < 100 && item.box8_pct_total === undefined) ||
      (sharePct === 100 && (item.box8_pct_total ?? 100) !== 100) ||
      (item.box8_pct_total ?? 100) !== (fields.annuity_share_pct ?? 100))
  ) {
    throw new Error(
      "Form 4972 NUA annuity box 8 percentage differs from Form 1099-R",
    );
  }
  const taxable = item.box2a_taxable_amount;
  const gain = item.box3_capital_gain ?? 0;
  const nua = item.box6_nua;
  if (
    taxable === undefined || taxable <= 0 ||
    gain > taxable || nua === undefined || nua <= 0 ||
    fields.lump_sum_amount !== taxable ||
    (fields.capital_gain_amount ?? 0) !== gain || fields.box6_nua !== nua
  ) {
    throw new Error(
      "Form 4972 NUA source amounts differ from Form 1099-R boxes 2a, 3, or 6",
    );
  }
  const roundedTaxable = Math.round(taxable);
  const roundedGain = Math.round(gain);
  const roundedNua = Math.round(nua);
  const capitalElection = fields.elect_capital_gain === true;
  const capitalNua = capitalElection
    ? Math.round(roundedNua * roundedGain / roundedTaxable)
    : 0;
  const ordinaryNua = roundedNua - capitalNua;
  const capitalLine = roundedGain + capitalNua;
  const ordinaryLine = Math.round(
    (roundedTaxable - (capitalElection ? roundedGain : 0) + ordinaryNua) /
      (sharePct / 100),
  );
  const ordinaryNuaNote = Math.round(ordinaryNua / (sharePct / 100));
  const averaging = fields.elect_10yr_averaging === true;
  if (hasAllocation) {
    const annuitySource = item.box8_other ?? 0;
    // This route retains raw box 8 cents; the calculator rounds its grossed-up
    // line 11 before the official annuity worksheet. Cash allocations stay exact.
    if (
      annuitySource > 0 &&
      (!Number.isInteger(taxable) || !Number.isInteger(gain) ||
        !Number.isInteger(nua) ||
        (!partialNuaDeathAnnuityEstatePartIII &&
          !Number.isInteger(annuitySource)) ||
        (capitalElection && roundedNua * roundedGain % roundedTaxable !== 0))
    ) {
      throw new Error(
        "Form 4972 NUA and annuity allocation needs whole-dollar sources and exact NUA capital allocation",
      );
    }
    const computed = form4972.compute(
      { taxYear: 2025, formType: "f1040" },
      form4972Schema.parse(fields),
    ).outputs;
    const calculatedForm = computed.find((output) =>
      output.nodeType === "form4972"
    )?.fields;
    const calculatedTax = computed.find((output) =>
      output.nodeType === "income_tax_calculation"
    )?.fields.form4972_tax;
    const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
    const ownOrdinary = computed.find((output) => output.nodeType === "f1040")
      ?.fields.line5b_form4972_ordinary;
    if (
      !calculatedForm ||
      Array.from({ length: 25 }, (_, index) => `line${index + 6}`)
        .some((key) => calculatedForm[key] !== fields[key]) ||
      calculatedForm.line6_nua_capital_gain !==
        fields.line6_nua_capital_gain ||
      calculatedForm.line8_nua_included !== fields.line8_nua_included ||
      returnFields?.form4972_tax !== calculatedTax ||
      (!averaging &&
        (typeof ownOrdinary !== "number" ||
          typeof returnFields?.line5b_pension_taxable !== "number" ||
          returnFields.line5b_pension_taxable < ownOrdinary))
    ) {
      throw new Error(
        "Form 4972 NUA death/estate allocation differs from the sourced 2025 calculation or Form 1040",
      );
    }
    return;
  }
  if (!averaging) {
    const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
    const recipientOrdinary = roundedTaxable - roundedGain + ordinaryNua;
    if (
      !capitalElection ||
      fields.line8 !== undefined || fields.line8_nua_included !== undefined ||
      fields.line29 !== undefined || fields.line30 !== undefined ||
      !returnFields || returnFields.form4972_tax !== fields.line7 ||
      typeof returnFields.line5b_pension_taxable !== "number" ||
      returnFields.line5b_pension_taxable < recipientOrdinary
    ) {
      throw new Error(
        "Form 4972 Part-II-only NUA needs its recipient ordinary income and special tax on Form 1040 without Part III",
      );
    }
  }
  if (
    (capitalElection && (roundedGain <= 0 || capitalNua <= 0)) ||
    ordinaryNua <= 0 ||
    (capitalElection
      ? fields.line6_nua_capital_gain !== capitalNua ||
        fields.line6 !== capitalLine ||
        fields.line7 !== Math.round(capitalLine * 0.2)
      : fields.line6_nua_capital_gain !== undefined ||
        fields.line6 !== undefined || fields.line7 !== undefined) ||
    (averaging &&
      (fields.line8_nua_included !== ordinaryNuaNote ||
        fields.line8 !== ordinaryLine))
  ) {
    throw new Error(
      "Form 4972 NUA worksheet does not reconcile with lines 6 through 8",
    );
  }
  const annuitySource = item.box8_other ?? 0;
  if (annuitySource > 0) {
    const annuitySharePct = item.box8_pct_total ?? 100;
    if (
      !Number.isInteger(taxable) || !Number.isInteger(gain) ||
      !Number.isInteger(nua) || !Number.isInteger(annuitySource) ||
      (capitalElection && roundedNua * roundedGain % roundedTaxable !== 0)
    ) {
      throw new Error(
        "Form 4972 NUA and annuity bounded route needs whole-dollar sources and exact NUA capital allocation",
      );
    }
    const computed = form4972.compute(
      { taxYear: 2025, formType: "f1040" },
      form4972Schema.parse(fields),
    );
    const calculatedForm = computed.outputs.find((output) =>
      output.nodeType === "form4972"
    )?.fields;
    const calculatedTax = computed.outputs.find((output) =>
      output.nodeType === "income_tax_calculation"
    )?.fields.form4972_tax;
    const returnFields = pending?.f1040 as Record<string, unknown> | undefined;
    if (
      !calculatedForm ||
      Array.from({ length: 25 }, (_, index) => `line${index + 6}`)
        .some((key) => calculatedForm[key] !== fields[key]) ||
      returnFields?.form4972_tax !== calculatedTax ||
      fields.line11 !== Math.round(annuitySource / (annuitySharePct / 100))
    ) {
      throw new Error(
        "Form 4972 NUA and annuity lines differ from Form 1099-R and Form 1040 tax",
      );
    }
  }
}
