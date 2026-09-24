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
  line9_total_income?: number | null;
  line10_adjustments?: number | null;
  line11_agi?: number | null;
  line12c_deduction_total?: number | null;
  line13_qbi_deduction?: number | null;
  line13b_additional_deductions?: number | null;
  line14_deductions_qbi_total?: number | null;
  line15_taxable_income?: number | null;
  line16_income_tax?: number | null;
  line17_additional_taxes?: number | null;
  line18_total_tax_before_credits?: number | null;
  line19_child_tax_credit?: number | null;
  line20_nonrefundable_credits?: number | null;
  line21_credits_total?: number | null;
  line22_tax_after_credits?: number | null;
  line23_other_taxes?: number | null;
  line24_total_tax?: number | null;
  line25a_w2_withheld?: number | null;
  line25b_withheld_1099?: number | null;
  line25c_additional_medicare_withheld?: number | null;
  line25d_total_withholding?: number | null;
  line26_estimated_tax?: number | null;
  line27_eitc?: number | null;
  line28_actc?: number | null;
  line29_refundable_aoc?: number | null;
  line30_refundable_adoption?: number | null;
  line31_additional_payments?: number | null;
  line32_refundable_credits_total?: number | null;
  line33_total_payments?: number | null;
  line34_overpayment?: number | null;
  line35a_refund?: number | null;
  line37_amount_owed?: number | null;
  line38_underpayment_penalty?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040.xsd (2025v3.0).
// Sequence order here MUST match the XSD element sequence.
// Key corrections from original:
//   line1e_taxable_dep_care → TaxableBenefitsAmt (was TaxableDependentCareExpnsesAmt)
//   line4a_ira_gross → IRADistributionsAmt (was TotalIRADistributionsAmt)
//   line4b_ira_taxable → TaxableIRAAmt (was TaxableIRADistributionsAmt)
//   line5a_pension_gross → PensionsAnnuitiesAmt (was TotalPensionsAndAnnuitiesAmt)
//   line5b_pension_taxable → TotalTaxablePensionsAmt (was TaxablePensionsAndAnnuitiesAmt)
//   line17_additional_taxes → AdditionalTaxAmt (was OtherTaxAmt, which is inside OtherTaxAmtGrp)
//   line25a_w2_withheld → FormW2WithheldTaxAmt (WithholdingTaxAmt is line 25d)
//   line25b_withheld_1099 → Form1099WithheldTaxAmt (was Form1099WithholdingAmt)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1a_wages", "WagesAmt"],
  ["line1c_unreported_tips", "TipIncomeAmt"],
  ["line1e_taxable_dep_care", "TaxableBenefitsAmt"],
  ["line1f_taxable_adoption_benefits", "TaxableBenefitsForm8839Amt"],
  ["line1g_wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["line1i_combat_pay", "NontxCombatPayElectionAmt"],
  ["line2a_tax_exempt", "TaxExemptInterestAmt"],
  ["line2b_taxable_interest", "TaxableInterestAmt"],
  ["line3a_qualified_dividends", "QualifiedDividendsAmt"],
  ["line3b_ordinary_dividends", "OrdinaryDividendsAmt"],
  ["line4a_ira_gross", "IRADistributionsAmt"],
  ["line4b_ira_taxable", "TaxableIRAAmt"],
  ["line5a_pension_gross", "PensionsAnnuitiesAmt"],
  ["line5b_pension_taxable", "TotalTaxablePensionsAmt"],
  ["line6a_ss_gross", "SocSecBnftAmt"],
  ["line6b_ss_taxable", "TaxableSocSecAmt"],
  ["line7_capital_gain", "CapitalGainLossAmt"],
  ["line7a_cap_gain_distrib", "CapitalGainLossAmt"],
  ["line9_total_income", "TotalIncomeAmt"],
  ["line10_adjustments", "TotalAdjustmentsAmt"],
  ["line11_agi", "AdjustedGrossIncomeAmt"],
  ["line12c_deduction_total", "TotalItemizedOrStandardDedAmt"],
  ["line13_qbi_deduction", "QualifiedBusinessIncomeDedAmt"],
  ["line13b_additional_deductions", "TotalAdditionalDeductionsAmt"],
  ["line14_deductions_qbi_total", "TotalDeductionsAmt"],
  ["line15_taxable_income", "TaxableIncomeAmt"],
  ["line16_income_tax", "TaxAmt"],
  ["line17_additional_taxes", "AdditionalTaxAmt"],
  ["line18_total_tax_before_credits", "TotalTaxBeforeCrAndOthTaxesAmt"],
  ["line19_child_tax_credit", "CTCODCAmt"],
  ["line20_nonrefundable_credits", "TotalNonrefundableCreditsAmt"],
  ["line21_credits_total", "TotalCreditsAmt"],
  ["line22_tax_after_credits", "TaxLessCreditsAmt"],
  ["line23_other_taxes", "TotalOtherTaxesAmt"],
  ["line24_total_tax", "TotalTaxAmt"],
  ["line25a_w2_withheld", "FormW2WithheldTaxAmt"],
  ["line25b_withheld_1099", "Form1099WithheldTaxAmt"],
  ["line25c_additional_medicare_withheld", "TaxWithheldOtherAmt"],
  ["line25d_total_withholding", "WithholdingTaxAmt"],
  ["line26_estimated_tax", "EstimatedTaxPaymentsAmt"],
  ["line27_eitc", "EarnedIncomeCreditAmt"],
  ["line28_actc", "AdditionalChildTaxCreditAmt"],
  ["line29_refundable_aoc", "RefundableAmerOppCreditAmt"],
  ["line30_refundable_adoption", "RefundableAdoptionCreditAmt"],
  ["line31_additional_payments", "TotalOtherPaymentsRfdblCrAmt"],
  ["line32_refundable_credits_total", "RefundableCreditsAmt"],
  ["line33_total_payments", "TotalPaymentsAmt"],
  ["line34_overpayment", "OverpaidAmt"],
  ["line35a_refund", "RefundAmt"],
  ["line37_amount_owed", "OwedAmt"],
  ["line38_underpayment_penalty", "EsPenaltyAmt"],
];

/**
 * Resolve a pending-dict value to a number.
 *
 * Upstream nodes and assembleReturn() both write to the same keys, causing
 * scalars to be promoted to arrays by the executor's mergePending logic
 * (e.g. line1a_wages becomes [75000, 75000] after two scalar writes).
 * Take the last entry of any array — assembleReturn() is the final writer and
 * its value is the authoritative computed result.
 */
function resolveNumber(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return typeof last === "number" ? last : undefined;
  }
  return typeof value === "number" ? value : undefined;
}

// Maps FilingStatus enum values to IRS IndividualReturnFilingStatusCd codes.
// XSD enumerates "1" through "5": single, MFJ, MFS, HOH, QSS.
const FILING_STATUS_CODE: Record<string, string> = {
  single: "1",
  mfj: "2",
  mfs: "3",
  hoh: "4",
  qss: "5",
};

function buildIRS1040(fields: Input): string {
  // IndividualReturnFilingStatusCd is required by IRS1040.xsd §230 and must
  // precede all income/deduction fields in the XSD sequence.
  const statusRaw = fields["filing_status"];
  const statusCode = typeof statusRaw === "string"
    ? (FILING_STATUS_CODE[statusRaw] ?? "1")
    : "1";

  // VirtualCurAcquiredDurTYInd is required by IRS1040.xsd §338 (BooleanType).
  // Default to "false" — most returns do not involve digital asset transactions.
  const requiredPrefix = [
    element("IndividualReturnFilingStatusCd", statusCode),
    element("VirtualCurAcquiredDurTYInd", "false"),
  ];

  const incomeChildren = FIELD_MAP.map(([key, tag]) => {
    const value = resolveNumber(fields[key]);
    if (value === undefined) return "";
    return element(tag, value);
  });

  // RefundProductCd is REQUIRED by IRS1040.xsd §1894 (minOccurs defaults to 1).
  // "NO FINANCIAL PRODUCT" indicates the filer is not using a refund anticipation
  // loan or refund transfer product — the correct value for direct refunds.
  const requiredSuffix = [
    element("RefundProductCd", "NO FINANCIAL PRODUCT"),
  ];

  const allChildren = [...requiredPrefix, ...incomeChildren, ...requiredSuffix];
  return elements("IRS1040", allChildren);
}

export const irs1040: MefFormDescriptor<"f1040", Input> = {
  pendingKey: "f1040",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  build(fields) {
    return buildIRS1040(fields);
  },
};
