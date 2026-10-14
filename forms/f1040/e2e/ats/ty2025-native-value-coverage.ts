import { XMLParser, XMLValidator } from "fast-xml-parser";

// Explicit reviewed mapping, kept separate from the production serializers.
// These targets cover direct fields in single-copy return and schedule roots.
const fields: Record<
  string,
  readonly [string, string, ("boolean" | "checkbox")?]
> = {
  "schedule1.line1_state_refund": [
    "IRS1040Schedule1",
    "StateLocalIncomeTaxRefundAmt",
  ],
  "schedule1.line3_schedule_c": ["IRS1040Schedule1", "BusinessIncomeLossAmt"],
  "schedule1.line5_schedule_e": [
    "IRS1040Schedule1",
    "RentalRealEstateIncomeLossAmt",
  ],
  "schedule1.line6_schedule_f": ["IRS1040Schedule1", "NetFarmProfitLossAmt"],
  "schedule1.line15_se_deduction": [
    "IRS1040Schedule1",
    "DeductibleSelfEmploymentTaxAmt",
  ],
  "schedule1.line17_se_health_insurance": [
    "IRS1040Schedule1",
    "SelfEmpldHealthInsDedAmt",
  ],
  "schedule2.line4_se_tax": ["IRS1040Schedule2", "SelfEmploymentTaxAmt"],
  "schedule2.line9_household_employment": [
    "IRS1040Schedule2",
    "HouseholdEmploymentTaxAmt",
  ],
  "schedule3.line6j_alt_fuel_vehicle_refueling": [
    "IRS1040Schedule3",
    "TotalPersonalUsePartOfCrAmt",
  ],
  "schedule_d.print_line7_st_total": [
    "IRS1040ScheduleD",
    "NetSTCapitalGainOrLossAmt",
  ],
  "schedule_d.print_line15_lt_total": [
    "IRS1040ScheduleD",
    "NetLTCapitalGainOrLossAmt",
  ],
  "f1040.taxpayer_blind": ["IRS1040", "PrimaryBlindInd", "checkbox"],
  "f1040.digital_assets": ["IRS1040", "VirtualCurAcquiredDurTYInd", "boolean"],
  "f1040.line5c_pension_rollover": [
    "IRS1040",
    "PensionsAnnuitiesRolloverInd",
    "checkbox",
  ],
  "f1040.line1z_total_wages": ["IRS1040", "WagesSalariesAndTipsAmt"],
  "f1040.line14_deductions_qbi_total": ["IRS1040", "TotalDeductionsAmt"],
  "f1040.line18_total_tax_before_credits": [
    "IRS1040",
    "TotalTaxBeforeCrAndOthTaxesAmt",
  ],
  "f1040.line21_credits_total": ["IRS1040", "TotalCreditsAmt"],
  "f1040.line22_tax_after_credits": ["IRS1040", "TaxLessCreditsAmt"],
  "f1040.line25d_total_withholding": ["IRS1040", "WithholdingTaxAmt"],
  "f1040.line33_total_payments": ["IRS1040", "TotalPaymentsAmt"],
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
    Object.hasOwn(fields, t.path) &&
    typeof t.expected === (fields[t.path][2] ? "boolean" : "number")
  );
  const rows = selected.map((target) => {
    const [root, field, encoding] = fields[target.path];
    let actual: number | boolean | null = null;
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
      else if (encoding) {
        // An omitted optional checkbox remains missing, never an inferred false.
        if (encoding === "checkbox" && value === "X") actual = true;
        else if (
          encoding === "boolean" && typeof value === "string" &&
          ["true", "1"].includes(value)
        ) {
          actual = true;
        } else if (
          encoding === "boolean" && typeof value === "string" &&
          ["false", "0"].includes(value)
        ) {
          actual = false;
        }
        result = actual === null
          ? "invalid-value"
          : actual === target.expected
          ? "match"
          : "different";
      } else if (
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
      "Selected direct numeric and indicator XML fields only; separate from calculation matches, PDF review, ownership, IRS business rules and acceptance",
    unmappedTargetPaths: targets.filter((t) => !selected.includes(t)).map((t) =>
      t.path
    ),
    rows,
  };
}
