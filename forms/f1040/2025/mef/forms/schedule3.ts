import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_foreign_tax_credit?: number | null;
  line1_foreign_tax_1099?: number | null;
  line2_childcare_credit?: number | null;
  line3_education_credit?: number | null;
  line4_retirement_savings_credit?: number | null;
  line6b_child_tax_credit?: number | null;
  line6c_adoption_credit?: number | null;
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
  ["line6c_adoption_credit", "AdoptionCreditAmt"],
  ["line10_amount_paid_extension", "RequestForExtensionAmt"],
  ["line11_excess_ss", "ExcessSocSecAndTier1RRTATaxAmt"],
];

// Aggregated: multiple inputSchema keys -> single XSD element
// ForeignTaxCreditAmt (line 1) is processed before FIELD_MAP to maintain XSD order
const AGGREGATED: ReadonlyArray<readonly [string, ...(keyof Fields)[]]> = [
  ["ForeignTaxCreditAmt", "line1_foreign_tax_credit", "line1_foreign_tax_1099"],
];

function buildIRS1040Schedule3(fields: Input): string {
  const children: string[] = [];

  // Aggregated mappings first (line 1 comes before line 2 in XSD order)
  for (const [tag, ...keys] of AGGREGATED) {
    const values = keys
      .map((k) => fields[k])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    children.push(element(tag, sum));
  }

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    children.push(element(tag, value));
  }

  return elements("IRS1040Schedule3", children);
}

export const schedule3: MefFormDescriptor<"schedule3", Input> = {
  pendingKey: "schedule3",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s3.pdf",
  build(fields) {
    return buildIRS1040Schedule3(fields);
  },
};
