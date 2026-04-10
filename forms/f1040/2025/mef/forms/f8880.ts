import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// Element names and sequence match IRS8880.xsd (2025v3.0).
export interface Fields {
  roth_contributions_taxpayer?: number | null;   // line 1a
  roth_contributions_spouse?: number | null;     // line 1b
  contributions_taxpayer?: number | null;        // line 2a
  contributions_spouse?: number | null;          // line 2b
  add_roth_to_contributions_taxpayer?: number | null; // line 3a
  add_roth_to_contributions_spouse?: number | null;   // line 3b
  distributions_taxpayer?: number | null;        // line 4a
  distributions_spouse?: number | null;          // line 4b
  net_contributions_taxpayer?: number | null;    // line 5a
  net_contributions_spouse?: number | null;      // line 5b
  smaller_of_taxpayer?: number | null;           // line 6a
  smaller_of_spouse?: number | null;             // line 6b
  total_calculated?: number | null;              // line 7
  agi?: number | null;                           // line 8
  decimal_amount?: number | null;                // line 9
  calculated_by_decimal?: number | null;         // line 10
  credits_from_tax?: number | null;              // line 11
  credit?: number | null;                        // line 12
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["roth_contributions_taxpayer", "PrimaryRothIRAForCurrentYrAmt"],
  ["roth_contributions_spouse", "SpouseRothIRAForCurrentYrAmt"],
  ["contributions_taxpayer", "PrimaryContributionsAmt"],
  ["contributions_spouse", "SpouseContributionsAmt"],
  ["add_roth_to_contributions_taxpayer", "AddPrimRothIRAToCYContriAmt"],
  ["add_roth_to_contributions_spouse", "AddSpRothIRAToCYContriAmt"],
  ["distributions_taxpayer", "PrimTaxableDistributionsAmt"],
  ["distributions_spouse", "SpsTaxableDistributionsAmt"],
  ["net_contributions_taxpayer", "CalculatePrimDistribFromTotAmt"],
  ["net_contributions_spouse", "CalculateSpsDistribFromTotAmt"],
  ["smaller_of_taxpayer", "PrimSmallerOfCalculationAmt"],
  ["smaller_of_spouse", "SpsSmallerOfCalculationAmt"],
  ["total_calculated", "TotalCalculatedAmt"],
  ["agi", "TaxReturnAGIAmt"],
  ["decimal_amount", "QlfyRetirementSavDecimalAmt"],
  ["calculated_by_decimal", "CalculatedAmtByDecimalAmt"],
  ["credits_from_tax", "CalculatedCreditsFromTaxAmt"],
  ["credit", "CrQualifiedRetirementSavAmt"],
];

function buildIRS8880(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8880", children);
}

export const form8880: MefFormDescriptor<"form8880", Input> = {
  pendingKey: "form8880",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  build(fields) {
    return buildIRS8880(fields);
  },
};
