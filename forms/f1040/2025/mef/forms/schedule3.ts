import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_foreign_tax_credit?: number | null;
  line1_foreign_tax_1099?: number | null;
  line2_childcare_credit?: number | null;
  line3_education_credit?: number | null;
  line4_retirement_savings_credit?: number | null;
  line5a_residential_clean_energy?: number | null;
  line5b_energy_efficient_home?: number | null;
  line6b_child_tax_credit?: number | null;
  line6c_adoption_credit?: number | null;
  line6j_alt_fuel_vehicle_refueling?: number | null;
  line6l_form8978_credit?: number | null;
  line10_amount_paid_extension?: number | null;
  line11_excess_ss?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 field mappings (inputSchema key -> XSD element name, in XSD line order)
// Note: line6b_child_tax_credit is excluded — the 2025v3.0 XSD line 6b element
// (MinAMTCrAmt) is the Minimum AMT Credit from Form 8801, not the child tax credit.
// The engine's line6b_child_tax_credit has no corresponding XSD element in Schedule 3.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line2_childcare_credit", "CreditForChildAndDepdCareAmt"],
  ["line3_education_credit", "EducationCreditAmt"],
  ["line4_retirement_savings_credit", "RtrSavingsContributionsCrAmt"],
  ["line5a_residential_clean_energy", "ResidentialCleanEnergyCrAmt"],
  ["line5b_energy_efficient_home", "EgyEffcntHmImprvCrAmt"],
  ["line6c_adoption_credit", "AdoptionCreditAmt"],
  ["line6j_alt_fuel_vehicle_refueling", "TotalPersonalUsePartOfCrAmt"],
  ["line6l_form8978_credit", "TotRptgYrTxIncreaseDecreaseAmt"],
  ["line10_amount_paid_extension", "RequestForExtensionAmt"],
  ["line11_excess_ss", "ExcessSocSecAndTier1RRTATaxAmt"],
];

// Aggregated: multiple inputSchema keys -> single XSD element
// ForeignTaxCreditAmt (line 1) is processed before FIELD_MAP to maintain XSD order
const AGGREGATED: ReadonlyArray<readonly [string, ...(keyof Fields)[]]> = [
  ["ForeignTaxCreditAmt", "line1_foreign_tax_credit", "line1_foreign_tax_1099"],
];

function buildIRS1040Schedule3(fields: Input, context?: MefBuildContext): string {
  const children: string[] = [];

  // Aggregated mappings first (line 1 comes before line 2 in XSD order)
  for (const [tag, ...keys] of AGGREGATED) {
    const values = keys
      .map((k) => fields[k])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    const form1116Ids = context?.documentIdsByPendingKey?.form_1116 ?? [];
    children.push(element(tag, sum, form1116Ids.length > 0
      ? {
        referenceDocumentId: form1116Ids.join(" "),
        referenceDocumentName: "IRS1116",
      }
      : undefined));
  }

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    if (key === "line6l_form8978_credit") {
      const formIds = context?.documentIdsByPendingKey?.f8978 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 3 line 6l needs attached Forms 8978");
      }
      children.push(element(tag, value, formIds.length > 0
        ? {
          referenceDocumentId: formIds.join(" "),
          referenceDocumentName: "IRS8978",
        }
        : undefined));
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
