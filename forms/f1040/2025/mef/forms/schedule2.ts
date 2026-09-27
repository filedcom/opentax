import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1a_excess_advance_premium?: number | null;
  line1b_new_clean_vehicle_repayment?: number | null;
  line1c_prev_owned_clean_vehicle_repayment?: number | null;
  line2_amt?: number | null;
  line4_se_tax?: number | null;
  line5_unreported_tip_tax?: number | null;
  line6_uncollected_8919?: number | null;
  line8_form5329_tax?: number | null;
  line9_household_employment?: number | null;
  line11_additional_medicare?: number | null;
  line12_niit?: number | null;
  uncollected_fica?: number | null;
  uncollected_fica_gtl?: number | null;
  section409a_excise?: number | null;
  line17h_nqdc_tax?: number | null;
  golden_parachute_excise?: number | null;
  line17k_golden_parachute_excise?: number | null;
  line17c_hsa_penalty?: number | null;
  line17b_mortgage_subsidy_recapture?: number | null;
  line16_lihtc_recapture?: number | null;
  line17e_archer_msa_tax?: number | null;
  line17f_medicare_advantage_msa_tax?: number | null;
  line17p_form8621_interest?: number | null;
  line17z_other_additional_taxes?: number | null;
  line20_965_tax_installment?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 field mappings (inputSchema key -> XSD element name)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1a_excess_advance_premium", "PremiumTaxCreditTaxLiabAmt"],
  ["line1b_new_clean_vehicle_repayment", "CrTrnsfrDlrSaleAmt"],
  ["line1c_prev_owned_clean_vehicle_repayment", "PrevOwnCrTrnsfrDlrSaleAmt"],
  ["line2_amt", "AlternativeMinimumTaxAmt"],
  ["line4_se_tax", "SelfEmploymentTaxAmt"],
  ["line5_unreported_tip_tax", "SocSecMedicareTaxUnrptdTipAmt"],
  ["line6_uncollected_8919", "UncollectedSocSecMedTaxAmt"],
  ["line8_form5329_tax", "TaxOnIRAsAmt"],
  ["line9_household_employment", "HouseholdEmploymentTaxAmt"],
  ["line11_additional_medicare", "TotalAMRRTTaxAmt"],
  ["line12_niit", "IndivNetInvstIncomeTaxAmt"],
  ["line16_lihtc_recapture", "RecaptureTaxAmt"],
  ["line17b_mortgage_subsidy_recapture", "MortgSbsdyRecaptureTaxAmt"],
  ["line17c_hsa_penalty", "HSADistriAddnlPercentTaxAmt"],
  ["line17e_archer_msa_tax", "ArcherMSAAddnlDistriTaxAmt"],
  ["line17f_medicare_advantage_msa_tax", "MedicareMSAAddnlDistriTaxAmt"],
  ["line20_965_tax_installment", "Section965TaxInstallmentAmt"],
];

// Aggregated mappings: multiple inputSchema fields -> single XSD element
// Each tuple: [XSD element name, ...inputSchema keys to sum]
const AGGREGATED: ReadonlyArray<readonly [string, ...(keyof Fields)[]]> = [
  ["UncollSSMedcrRRTAGrpInsTxAmt", "uncollected_fica", "uncollected_fica_gtl"],
  ["IncmNonqlfyDefrdCompPlanAmt", "section409a_excise", "line17h_nqdc_tax"],
  [
    "ExcessParachutePaymentAmt",
    "golden_parachute_excise",
    "line17k_golden_parachute_excise",
  ],
];

// IRS1040Schedule2.xsd is a sequence, not an unordered set of line elements.
const ELEMENT_ORDER = [
  "PremiumTaxCreditTaxLiabAmt",
  "CrTrnsfrDlrSaleAmt",
  "PrevOwnCrTrnsfrDlrSaleAmt",
  "AlternativeMinimumTaxAmt",
  "SelfEmploymentTaxAmt",
  "SocSecMedicareTaxUnrptdTipAmt",
  "UncollectedSocSecMedTaxAmt",
  "TaxOnIRAsAmt",
  "HouseholdEmploymentTaxAmt",
  "TotalAMRRTTaxAmt",
  "IndivNetInvstIncomeTaxAmt",
  "UncollSSMedcrRRTAGrpInsTxAmt",
  "RecaptureTaxAmt",
  "MortgSbsdyRecaptureTaxAmt",
  "HSADistriAddnlPercentTaxAmt",
  "ArcherMSAAddnlDistriTaxAmt",
  "MedicareMSAAddnlDistriTaxAmt",
  "IncmNonqlfyDefrdCompPlanAmt",
  "ExcessParachutePaymentAmt",
  "InterestOnEachNetIncrInTaxAmt",
  "TotalAnyOtherTaxesAmt",
  "Section965TaxInstallmentAmt",
  "TotalOtherTaxesAmt",
] as const;

function buildIRS1040Schedule2(
  fields: Input,
  context?: MefBuildContext,
): string {
  const childrenByTag = new Map<string, string>();

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    if (
      key === "line1b_new_clean_vehicle_repayment" ||
      key === "line1c_prev_owned_clean_vehicle_repayment"
    ) {
      const formIds = context?.documentIdsByTag?.IRS8936 ?? [];
      if (context?.documentIdsByTag && formIds.length === 0) {
        throw new Error("Schedule 2 clean-vehicle repayment needs Form 8936");
      }
      childrenByTag.set(
        tag,
        element(
          tag,
          value,
          formIds.length > 0
            ? {
              referenceDocumentId: formIds.join(" "),
              referenceDocumentName: "IRS8936",
            }
            : undefined,
        ),
      );
      continue;
    }
    if (key === "line16_lihtc_recapture" && value > 0) {
      const formIds = context?.documentIdsByPendingKey?.f8611 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 2 line 16 needs attached Forms 8611");
      }
      childrenByTag.set(tag, element(
        tag,
        value,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8611",
          }
          : undefined,
      ));
      continue;
    }
    childrenByTag.set(tag, element(tag, value));
  }

  // Aggregated mappings
  for (const [tag, ...keys] of AGGREGATED) {
    const values = keys.map((k) => fields[k]).filter((v): v is number =>
      typeof v === "number"
    );
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    childrenByTag.set(tag, element(tag, sum));
  }

  const form8621Interest = fields.line17p_form8621_interest;
  if (typeof form8621Interest === "number" && form8621Interest > 0) {
    const formIds = context?.documentIdsByPendingKey?.form8621 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error("Schedule 2 line 17p needs an attached Form 8621");
    }
    childrenByTag.set(
      "InterestOnEachNetIncrInTaxAmt",
      element(
        "InterestOnEachNetIncrInTaxAmt",
        form8621Interest,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8621",
          }
          : undefined,
      ),
    );
  }

  const adjustment = context?.pending?.form8978_reporting_year;
  const reduction = adjustment && typeof adjustment === "object"
    ? (adjustment as Record<string, unknown>).schedule2_line17z_reduction
    : undefined;
  const line17z = (fields.line17z_other_additional_taxes ?? 0) -
    (typeof reduction === "number" ? reduction : 0);
  if (line17z !== 0) {
    const statementId = context?.documentIdsByPendingKey
      ?.any_other_taxes_statement?.[0];
    if (context?.documentIdsByPendingKey && !statementId) {
      throw new Error("Schedule 2 line 17z needs its other-taxes statement");
    }
    childrenByTag.set(
      "TotalAnyOtherTaxesAmt",
      element(
        "TotalAnyOtherTaxesAmt",
        line17z,
        statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName: "AnyOtherTaxesStatement",
          }
          : undefined,
      ),
    );
  }
  const adjustedPart2 = adjustment && typeof adjustment === "object"
    ? (adjustment as Record<string, unknown>).schedule2_line21
    : undefined;
  if (
    typeof adjustedPart2 === "number" &&
    (adjustedPart2 > 0 || (typeof reduction === "number" && reduction > 0))
  ) {
    childrenByTag.set(
      "TotalOtherTaxesAmt",
      element("TotalOtherTaxesAmt", adjustedPart2),
    );
  }

  return elements(
    "IRS1040Schedule2",
    ELEMENT_ORDER.map((tag) => childrenByTag.get(tag) ?? ""),
  );
}

export const schedule2: MefFormDescriptor<"schedule2", Input> = {
  pendingKey: "schedule2",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  build(fields, context) {
    return buildIRS1040Schedule2(fields, context);
  },
};
