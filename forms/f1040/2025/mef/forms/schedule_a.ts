import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line_1_medical?: number | null;
  agi?: number | null;
  line_5a_tax_amount?: number | null;
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
// - line_5a_tax_amount → StateAndLocalTaxAmt (covers income or sales taxes; use
//   StateAndLocalSalesTaxInd checkbox for sales-tax election, not mapped here)
// - line_8a_mortgage_interest_1098 → RptHomeMortgIntAndPointsAmt
//   (MortgageInterestPd1098Amt is not in the 2025v3.0 XSD)
// - line_8b_mortgage_interest_no_1098 → Form1098HomeMortgIntNotRptAmt
//   (wraps a complex type — scalar emission may fail strict validation,
//   but xmllint accepts it for non-strict content models)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line_1_medical", "MedicalAndDentalExpensesAmt"],
  ["agi", "TaxReturnAGIAmt"],
  ["line_5a_tax_amount", "StateAndLocalTaxAmt"],
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
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
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
