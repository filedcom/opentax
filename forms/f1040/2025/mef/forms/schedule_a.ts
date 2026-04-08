import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line_1_medical?: number | null;
  agi?: number | null;
  // IRC §164(b)(5) election: either income tax or sales tax — mutually exclusive.
  // Both fields map to the same IRS XSD element (StateAndLocalTaxAmt).
  line_5a_state_income_tax?: number | null;
  line_5a_sales_tax?: number | null;
  line_5b_real_estate_tax?: number | null;
  line_5c_personal_property_tax?: number | null;
  line_6_other_taxes?: number | null;
  line_8a_mortgage_interest_1098?: number | null;
  line_9_investment_interest?: number | null;
  line_11_cash_contributions?: number | null;
  line_12_noncash_contributions?: number | null;
  line_13_contribution_carryover?: number | null;
  line_15_casualty_theft_loss?: number | null;
  line_16_other_deductions?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040ScheduleA.xsd §2025v3.0.
// - agi → TaxReturnAGIAmt (AGIAmt is not a valid element in this form's XSD)
// - line_5a_state_income_tax / line_5a_sales_tax → both map to StateAndLocalTaxAmt
//   (IRC §164(b)(5) election; mutually exclusive so only one will be nonzero;
//   combined in buildIRS1040ScheduleA before emission)
// - line_8a_mortgage_interest_1098 → RptHomeMortgIntAndPointsAmt
//   (MortgageInterestPd1098Amt is not in the 2025v3.0 XSD)
// - line_8b_mortgage_interest_no_1098 → Form1098HomeMortgIntNotRptAmt
//   (wraps a complex type — scalar emission may fail strict validation,
//   but xmllint accepts it for non-strict content models)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line_1_medical", "MedicalAndDentalExpensesAmt"],
  ["agi", "TaxReturnAGIAmt"],
  // line_5a_state_income_tax and line_5a_sales_tax are combined below — not in FIELD_MAP
  ["line_5b_real_estate_tax", "RealEstateTaxesAmt"],
  ["line_5c_personal_property_tax", "PersonalPropertyTaxesAmt"],
  ["line_6_other_taxes", "OtherTaxesAmt"],
  ["line_8a_mortgage_interest_1098", "RptHomeMortgIntAndPointsAmt"],
  ["line_9_investment_interest", "InvestmentInterestAmt"],
  ["line_11_cash_contributions", "GiftsByCashOrCheckAmt"],
  ["line_12_noncash_contributions", "OtherThanByCashOrCheckAmt"],
  ["line_13_contribution_carryover", "CarryoverFromPriorYearAmt"],
  ["line_15_casualty_theft_loss", "CasualtyAndTheftLossesAmt"],
  ["line_16_other_deductions", "OtherMiscellaneousDedAmt"],
];

function buildIRS1040ScheduleA(fields: Input): string {
  // Combine the mutually exclusive line 5a fields into a single XSD element.
  // Only one will be nonzero (enforced by schedule_a inputSchema superRefine).
  const line5a = (fields.line_5a_state_income_tax ?? 0) + (fields.line_5a_sales_tax ?? 0);

  // Elements must follow the XSD sequence order defined in IRS1040ScheduleA.xsd:
  //   MedicalAndDentalExpensesAmt → TaxReturnAGIAmt → ... → StateAndLocalTaxAmt → RealEstateTaxesAmt → ...
  // TaxReturnAGIAmt (AGI, line 2) must appear before StateAndLocalTaxAmt (line 5a).
  const mapField = ([key, tag]: readonly [keyof Fields, string]): string => {
    const value = fields[key];
    return typeof value === "number" ? element(tag, value) : "";
  };

  const children = [
    mapField(["line_1_medical", "MedicalAndDentalExpensesAmt"]),
    mapField(["agi", "TaxReturnAGIAmt"]),
    ...(line5a > 0 ? [element("StateAndLocalTaxAmt", line5a)] : []),
    mapField(["line_5b_real_estate_tax", "RealEstateTaxesAmt"]),
    mapField(["line_5c_personal_property_tax", "PersonalPropertyTaxesAmt"]),
    mapField(["line_6_other_taxes", "OtherTaxesAmt"]),
    mapField(["line_8a_mortgage_interest_1098", "RptHomeMortgIntAndPointsAmt"]),
    mapField(["line_9_investment_interest", "InvestmentInterestAmt"]),
    mapField(["line_11_cash_contributions", "GiftsByCashOrCheckAmt"]),
    mapField(["line_12_noncash_contributions", "OtherThanByCashOrCheckAmt"]),
    mapField(["line_13_contribution_carryover", "CarryoverFromPriorYearAmt"]),
    mapField(["line_15_casualty_theft_loss", "CasualtyAndTheftLossesAmt"]),
    mapField(["line_16_other_deductions", "OtherMiscellaneousDedAmt"]),
  ];
  return elements("IRS1040ScheduleA", children);
}

export const scheduleA: MefFormDescriptor<"schedule_a", Input> = {
  pendingKey: "schedule_a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sa.pdf",
  build(fields) {
    return buildIRS1040ScheduleA(fields);
  },
};
