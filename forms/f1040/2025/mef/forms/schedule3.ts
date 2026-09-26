import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_total?: number | null;
  line1_foreign_tax_credit?: number | null;
  line1_foreign_tax_1099?: number | null;
  line2_childcare_credit?: number | null;
  line3_education_credit?: number | null;
  line4_retirement_savings_credit?: number | null;
  line5a_residential_clean_energy?: number | null;
  line5b_energy_efficient_home?: number | null;
  line6a_total?: number | null;
  line6b_prior_year_min_tax_credit?: number | null;
  line6c_adoption_credit?: number | null;
  line6d_elderly_disabled_credit?: number | null;
  line6f_total?: number | null;
  line6g_mortgage_interest_credit?: number | null;
  line6h_dc_homebuyer_credit?: number | null;
  line6i_qualified_electric_vehicle_credit?: number | null;
  line6j_alt_fuel_vehicle_refueling?: number | null;
  line6k_tax_credit_bonds?: number | null;
  line6l_form8978_credit?: number | null;
  line6m_total?: number | null;
  line7_total?: number | null;
  line8_total?: number | null;
  line9_premium_tax_credit?: number | null;
  line10_amount_paid_extension?: number | null;
  line11_excess_ss?: number | null;
  line12_fuel_tax_credit?: number | null;
  line15_total?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

const sourceForms: Partial<Record<keyof Fields, readonly [string, string]>> = {
  line6h_dc_homebuyer_credit: ["f8859", "IRS8859"],
  line6i_qualified_electric_vehicle_credit: ["f8834", "IRS8834"],
  line6k_tax_credit_bonds: ["f8912", "IRS8912"],
  line12_fuel_tax_credit: ["f4136", "IRS4136"],
};

// Direct 1:1 field mappings (inputSchema key -> XSD element name, in XSD line order)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1_total", "ForeignTaxCreditAmt"],
  ["line2_childcare_credit", "CreditForChildAndDepdCareAmt"],
  ["line3_education_credit", "EducationCreditAmt"],
  ["line4_retirement_savings_credit", "RtrSavingsContributionsCrAmt"],
  ["line5a_residential_clean_energy", "ResidentialCleanEnergyCrAmt"],
  ["line5b_energy_efficient_home", "EgyEffcntHmImprvCrAmt"],
  ["line6a_total", "CurrentYearCreditAllowedAmt"],
  ["line6b_prior_year_min_tax_credit", "MinAMTCrAmt"],
  ["line6c_adoption_credit", "NonrefundableAdoptionCreditAmt"],
  ["line6d_elderly_disabled_credit", "CreditForElderlyOrDisabledAmt"],
  ["line6f_total", "CleanVehPrsnlUsePartCrAmt"],
  ["line6g_mortgage_interest_credit", "MortgageInterestCreditAmt"],
  ["line6h_dc_homebuyer_credit", "DCHmByrCurrentYearCreditAmt"],
  ["line6i_qualified_electric_vehicle_credit", "QlfyElecMotorVehCrAmt"],
  ["line6j_alt_fuel_vehicle_refueling", "TotalPersonalUsePartOfCrAmt"],
  ["line6k_tax_credit_bonds", "CurrentYearAllowableCreditAmt"],
  ["line6l_form8978_credit", "TotRptgYrTxIncreaseDecreaseAmt"],
  ["line6m_total", "MaxPrevOwnedCleanVehCrAmt"],
  ["line7_total", "OtherCreditsAmt"],
  ["line8_total", "TotalNonrefundableCreditsAmt"],
  ["line9_premium_tax_credit", "ReconciledPremiumTaxCreditAmt"],
  ["line10_amount_paid_extension", "RequestForExtensionAmt"],
  ["line11_excess_ss", "ExcessSocSecAndTier1RRTATaxAmt"],
  ["line12_fuel_tax_credit", "TotalFuelTaxCreditAmt"],
  ["line15_total", "TotalOtherPaymentsRfdblCrAmt"],
];

function buildIRS1040Schedule3(
  fields: Input,
  context?: MefBuildContext,
): string {
  const children: string[] = [];

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    if (key === "line1_total") {
      const form1116Ids = context?.documentIdsByPendingKey?.form_1116 ?? [];
      children.push(element(
        tag,
        value,
        form1116Ids.length > 0
          ? {
            referenceDocumentId: form1116Ids.join(" "),
            referenceDocumentName: "IRS1116",
          }
          : undefined,
      ));
      continue;
    }
    if (key === "line6l_form8978_credit") {
      const formIds = context?.documentIdsByPendingKey?.f8978 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 3 line 6l needs attached Forms 8978");
      }
      children.push(element(
        tag,
        value,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8978",
          }
          : undefined,
      ));
      continue;
    }
    const sourceForm = sourceForms[key];
    if (sourceForm) {
      const [pendingKey, documentName] = sourceForm;
      const formIds = context?.documentIdsByPendingKey?.[pendingKey] ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error(`Schedule 3 ${key} needs attached ${documentName}`);
      }
      children.push(element(
        tag,
        value,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: documentName,
          }
          : undefined,
      ));
      continue;
    }
    children.push(element(tag, value));
  }

  return elements("IRS1040Schedule3", children);
}

export const schedule3: MefFormDescriptor<"schedule3", Input> = {
  pendingKey: "schedule3",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s3.pdf",
  build(fields, context) {
    return buildIRS1040Schedule3(fields, context);
  },
};
