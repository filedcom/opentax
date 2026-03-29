import { element, elements } from "../../../mef/xml.ts";
import type { IRS1040Fields, IRS1040Input } from "../types.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof IRS1040Fields, string]> = [
  ["line1a_wages", "WagesAmt"],
  ["line1c_unreported_tips", "TipIncomeAmt"],
  ["line1e_taxable_dep_care", "TaxableDependentCareExpnsesAmt"],
  ["line1f_taxable_adoption_benefits", "TaxableBenefitsForm8839Amt"],
  ["line1g_wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["line1i_combat_pay", "CombatPayElectionAmt"],
  ["line2a_tax_exempt", "TaxExemptInterestAmt"],
  ["line2b_taxable_interest", "TaxableInterestAmt"],
  ["line3a_qualified_dividends", "QualifiedDividendsAmt"],
  ["line3b_ordinary_dividends", "OrdinaryDividendsAmt"],
  ["line4a_ira_gross", "TotalIRADistributionsAmt"],
  ["line4b_ira_taxable", "TaxableIRADistributionsAmt"],
  ["line5a_pension_gross", "TotalPensionsAndAnnuitiesAmt"],
  ["line5b_pension_taxable", "TaxablePensionsAndAnnuitiesAmt"],
  ["line6a_ss_gross", "SocSecBnftAmt"],
  ["line6b_ss_taxable", "TaxableSocSecAmt"],
  ["line7_capital_gain", "CapitalGainLossAmt"],
  ["line7a_cap_gain_distrib", "CapitalGainLossAmt"],
  ["line12e_itemized_deductions", "TotalItemizedOrStandardDedAmt"],
  ["line13_qbi_deduction", "QualifiedBusinessIncomeDedAmt"],
  ["line17_additional_taxes", "OtherTaxAmt"],
  ["line20_nonrefundable_credits", "TotalNonrefundableCreditsAmt"],
  ["line25a_w2_withheld", "WithholdingTaxAmt"],
  ["line25b_withheld_1099", "Form1099WithholdingAmt"],
  ["line25c_additional_medicare_withheld", "TaxWithheldOtherAmt"],
  ["line28_actc", "AdditionalChildTaxCreditAmt"],
  ["line29_refundable_aoc", "RefundableAOCreditAmt"],
  ["line30_refundable_adoption", "RefundableCreditsAmt"],
  ["line31_additional_payments", "TotalOtherPaymentsRfdblCrAmt"],
  ["line38_amount_paid_extension", "AmountPaidWithExtensionAmt"],
];

function buildIRS1040(fields: IRS1040Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class IRS1040MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040(pending.f1040 ?? {});
  }
}

export const irs1040 = new IRS1040MefNode();
