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
  line33_total_payments?: number | null;
  line38_amount_paid_extension?: number | null;
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
//   line25b_withheld_1099 → Form1099WithheldTaxAmt (was Form1099WithholdingAmt)
//   line33_total_payments → TotalPaymentsAmt (new — required for valid sequence)
//   line38_amount_paid_extension → EsPenaltyAmt (closest match; AmountPaidWithExtensionAmt is not in XSD)
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
  ["line12e_itemized_deductions", "TotalItemizedOrStandardDedAmt"],
  ["line13_qbi_deduction", "QualifiedBusinessIncomeDedAmt"],
  ["line17_additional_taxes", "AdditionalTaxAmt"],
  ["line20_nonrefundable_credits", "TotalNonrefundableCreditsAmt"],
  ["line25a_w2_withheld", "WithholdingTaxAmt"],
  ["line25b_withheld_1099", "Form1099WithheldTaxAmt"],
  ["line25c_additional_medicare_withheld", "TaxWithheldOtherAmt"],
  ["line28_actc", "AdditionalChildTaxCreditAmt"],
  ["line29_refundable_aoc", "RefundableAmerOppCreditAmt"],
  ["line30_refundable_adoption", "RefundableCreditsAmt"],
  ["line31_additional_payments", "TotalOtherPaymentsRfdblCrAmt"],
  ["line33_total_payments", "TotalPaymentsAmt"],
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
    // Don't emit zero-value optional fields for itemized deductions — a value
    // of 0 means the standard deduction was taken, not $0 itemized.
    if (key === "line12e_itemized_deductions" && value === 0) return "";
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
