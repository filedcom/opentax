import { element, elements } from "../xml.ts";
import type { IRS1040Fields, IRS1040Input } from "../types.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof IRS1040Fields, string]> = [
  ["line1a_wages", "WagesAmt"],
  ["line1e_taxable_dep_care", "TaxableDependentCareExpnsesAmt"],
  ["line1i_combat_pay", "CombatPayElectionAmt"],
  ["line2a_tax_exempt", "TaxExemptInterestAmt"],
  ["line3a_qualified_dividends", "QualifiedDividendsAmt"],
  ["line4a_ira_gross", "TotalIRADistributionsAmt"],
  ["line4b_ira_taxable", "TaxableIRADistributionsAmt"],
  ["line5a_pension_gross", "TotalPensionsAndAnnuitiesAmt"],
  ["line5b_pension_taxable", "TaxablePensionsAndAnnuitiesAmt"],
  ["line25a_w2_withheld", "WithholdingTaxAmt"],
  ["line25b_withheld_1099", "Form1099WithholdingAmt"],
  ["line12e_itemized_deductions", "TotalItemizedOrStandardDedAmt"],
  ["line28_actc", "AdditionalChildTaxCreditAmt"],
  ["line29_refundable_aoc", "RefundableAOCreditAmt"],
  ["line38_amount_paid_extension", "AmountPaidWithExtensionAmt"],
];

export function buildIRS1040(fields: IRS1040Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040", children);
}
