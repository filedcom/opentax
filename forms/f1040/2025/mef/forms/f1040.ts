import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1a_wages?: number | null;
  line1c_unreported_tips?: number | null;
  line1e_taxable_dep_care?: number | null;
  line1f_taxable_adoption_benefits?: number | null;
  line1g_wages_8919?: number | null;
  line1i_combat_pay?: number | null;
  line2a_tax_exempt?: number | null;
  line2b_taxable_interest?: number | null;
  line3a_qualified_dividends?: number | null;
  line3b_ordinary_dividends?: number | null;
  line4a_ira_gross?: number | null;
  line4b_ira_taxable?: number | null;
  line5a_pension_gross?: number | null;
  line5b_pension_taxable?: number | null;
  line6a_ss_gross?: number | null;
  line6b_ss_taxable?: number | null;
  line7_capital_gain?: number | null;
  line7a_cap_gain_distrib?: number | null;
  line12e_itemized_deductions?: number | null;
  line13_qbi_deduction?: number | null;
  line17_additional_taxes?: number | null;
  line20_nonrefundable_credits?: number | null;
  line25a_w2_withheld?: number | null;
  line25b_withheld_1099?: number | null;
  line25c_additional_medicare_withheld?: number | null;
  line28_actc?: number | null;
  line29_refundable_aoc?: number | null;
  line30_refundable_adoption?: number | null;
  line31_additional_payments?: number | null;
  line38_amount_paid_extension?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS1040(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040", children);
}

export const irs1040: MefFormDescriptor<"f1040", Input> = {
  pendingKey: "f1040",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  build(fields) {
    return buildIRS1040(fields);
  },
};
