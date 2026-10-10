import { XMLParser, XMLValidator } from "fast-xml-parser";

// Explicit reviewed mapping, kept separate from the production serializers.
// These targets cover direct numeric fields in single-copy 1040/6251 roots.
const fields: Record<string, readonly [string, string]> = {
  "f1040.line1a_wages": ["IRS1040", "WagesAmt"],
  "f1040.line5a_pension_gross": ["IRS1040", "PensionsAnnuitiesAmt"],
  "f1040.line5b_pension_taxable": ["IRS1040", "TotalTaxablePensionsAmt"],
  "f1040.line6a_ss_gross": ["IRS1040", "SocSecBnftAmt"],
  "f1040.line7_capital_gain": ["IRS1040", "CapitalGainLossAmt"],
  "f1040.line7a_cap_gain_distrib": ["IRS1040", "CapitalGainLossAmt"],
  "f1040.line8_additional_income": ["IRS1040", "TotalAdditionalIncomeAmt"],
  "f1040.line9_total_income": ["IRS1040", "TotalIncomeAmt"],
  "f1040.line10_adjustments": ["IRS1040", "TotalAdjustmentsAmt"],
  "f1040.line11_agi": ["IRS1040", "AdjustedGrossIncomeAmt"],
  "f1040.line16_income_tax": ["IRS1040", "TaxAmt"],
  "f1040.line20_nonrefundable_credits": [
    "IRS1040",
    "TotalNonrefundableCreditsAmt",
  ],
  "f1040.line23_other_taxes": ["IRS1040", "TotalOtherTaxesAmt"],
  "f1040.line34_overpayment": ["IRS1040", "OverpaidAmt"],
  "f1040.line37_amount_owed": ["IRS1040", "OwedAmt"],
  "f1040.line15_taxable_income": ["IRS1040", "TaxableIncomeAmt"],
  "f1040.line24_total_tax": ["IRS1040", "TotalTaxAmt"],
  "f1040.line25a_w2_withheld": ["IRS1040", "FormW2WithheldTaxAmt"],
  "f1040.line25b_withheld_1099": ["IRS1040", "Form1099WithheldTaxAmt"],
  "f1040.line28_actc": ["IRS1040", "AdditionalChildTaxCreditAmt"],
  "f1040.line35a_refund": ["IRS1040", "RefundAmt"],
  "form6251.regular_tax_income": ["IRS6251", "AGILessTotDedLessEnhncSrDedAmt"],
  "form6251.line2a_taxes_paid": ["IRS6251", "ScheduleATaxesAmt"],
  "form6251.amti": ["IRS6251", "AlternativeMinTaxableIncomeAmt"],
  "form6251.exemption": ["IRS6251", "AlternativeMinimumTaxExemptAmt"],
  "form6251.taxable_excess": ["IRS6251", "AdjAlternativeMinTaxableIncAmt"],
  "form6251.tentative_tax": ["IRS6251", "TaxOnAltMinTaxableIncAmt"],
  "form6251.amtftc": ["IRS6251", "AMTForeignTaxCreditAmt"],
  "form6251.net_tmt": ["IRS6251", "TentativeAlternativeMinTaxAmt"],
  "form6251.regular_tax": ["IRS6251", "AdjustedRegularTaxAmt"],
  "form6251.line11_amt": ["IRS6251", "AlternativeMinimumTaxAmt"],
};

interface Target {
  path: string;
  expected: number | boolean;
  basis: string;
  sourceLocation: string;
}
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
});
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Observe transmitted values, never fill omitted fields from pending data.
 * Missing zero fields are observations, not automatic IRS-rule violations.
 */
export function compareAtsNativeValues(xml: string | null, targets: Target[]) {
  let data: Record<string, unknown> | undefined;
  if (xml !== null && XMLValidator.validate(xml) === true) {
    const parsed = parser.parse(xml);
    if (record(parsed.Return) && record(parsed.Return.ReturnData)) {
      data = parsed.Return.ReturnData;
    }
  }
  const selected = targets.filter((t) =>
    typeof t.expected === "number" && Object.hasOwn(fields, t.path)
  );
  const rows = selected.map((target) => {
    const [root, field] = fields[target.path];
    let actual: number | null = null;
    let result: string;
    if (xml === null) result = "not-evaluated";
    else if (!data) result = "invalid-xml";
    else if (data[root] === undefined) result = "missing-document";
    else if (Array.isArray(data[root])) result = "ambiguous";
    else if (!record(data[root])) result = "missing-field";
    else {
      const value = data[root][field];
      if (value === undefined) result = "missing-field";
      else if (Array.isArray(value)) result = "ambiguous";
      else if (
        typeof value !== "string" || !/^-?\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value))
      ) result = "invalid-value";
      else {
        actual = Number(value);
        result = actual === target.expected ? "match" : "different";
      }
    }
    return { ...target, root, field, actual, result };
  });
  return {
    scope:
      "Selected direct numeric XML fields only; separate from calculation matches, PDF review, ownership, IRS business rules and acceptance",
    unmappedTargetPaths: targets.filter((t) => !selected.includes(t)).map((t) =>
      t.path
    ),
    rows,
  };
}
