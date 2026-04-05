import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  medicare_wages?: number | null;
  unreported_tips?: number | null;
  wages_8919?: number | null;
  se_income?: number | null;
  rrta_wages?: number | null;
  medicare_withheld?: number | null;
  rrta_medicare_withheld?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["medicare_wages", "TotalW2MedicareWagesAndTipsAmt"],
  ["unreported_tips", "TotalUnreportedMedicareTipsAmt"],
  ["wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["se_income", "TotalSelfEmploymentIncomeAmt"],
  ["rrta_wages", "TotalRailroadRetirementCompAmt"],
  ["medicare_withheld", "TotalW2MedicareTaxWithheldAmt"],
  ["rrta_medicare_withheld", "TotalW2AddlRRTTaxAmt"],
];

// IRS8959 has a deeply nested structure in the XSD:
//   IRS8959 → AdditionalTaxGrp → AdditionalMedicareTaxGrp → {fields}
// The FIELD_MAP above reflects the leaf-level tag names for reference, but
// emitting them at the IRS8959 top level violates the schema.
//
// The pending dict receives medicare_wages and medicare_withheld from the W-2
// node for computation tracking. These are present even when no Additional
// Medicare Tax actually applies (wages below threshold). Only emit IRS8959
// when actual AMT has been computed (i.e., amt_owed or similar signal is set).
// For now, return "" until the nested builder is properly implemented.
//
// TODO(10-xsd): Implement proper nested AdditionalTaxGrp structure when
// Additional Medicare Tax is actually owed.
function buildIRS8959(_fields: Input): string {
  return "";
}

export const form8959: MefFormDescriptor<"form8959", Input> = {
  pendingKey: "form8959",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8959.pdf",
  build(fields) {
    return buildIRS8959(fields);
  },
};
