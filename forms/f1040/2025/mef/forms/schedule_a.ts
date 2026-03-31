import type { ScheduleAMefFields, ScheduleAMefInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleAMefFields, string]> = [
  ["line_1_medical", "MedicalAndDentalExpensesAmt"],
  ["agi", "AGIAmt"],
  ["line_5a_tax_amount", "StateAndLocalIncomeTaxAmt"],
  ["line_5b_real_estate_tax", "RealEstateTaxesAmt"],
  ["line_5c_personal_property_tax", "PersonalPropertyTaxesAmt"],
  ["line_6_other_taxes", "OtherTaxesAmt"],
  ["line_8a_mortgage_interest_1098", "MortgageInterestPd1098Amt"],
  ["line_8b_mortgage_interest_no_1098", "MortgageIntNotOn1098Amt"],
  ["line_8c_points_no_1098", "MortgageIntNotRptOn1098Amt"],
  ["line_9_investment_interest", "InvestmentInterestAmt"],
  ["line_11_cash_contributions", "GiftsByCashOrCheckAmt"],
  ["line_12_noncash_contributions", "OtherThanByCashOrCheckAmt"],
  ["line_13_contribution_carryover", "CarryoverFromPriorYearAmt"],
  ["line_15_casualty_theft_loss", "CasualtyAndTheftLossesAmt"],
  ["line_16_other_deductions", "OtherItemizedDeductionsAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS1040ScheduleA(fields: ScheduleAMefInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleA", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class ScheduleAMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sa.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040ScheduleA(pending.schedule_a ?? {});
  }
}

export const scheduleA = new ScheduleAMefNode();
