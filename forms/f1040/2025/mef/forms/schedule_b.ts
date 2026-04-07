import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  taxable_interest_net?: number | null;
  ee_bond_exclusion?: number | null;
  ordinaryDividends?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Tag names verified against IRS1040ScheduleB.xsd (2025v3.0).
// Element order matches the XSD sequence (required for validation).
// - taxable_interest_net → TaxableInterestSubtotalAmt (line 2)
// - ee_bond_exclusion    → ExcludableSavingsBondIntAmt (line 3, note: "Excludable" not "Excludible")
// - ordinaryDividends    → TotalOrdinaryDividendsAmt  (line 6)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["taxable_interest_net", "TaxableInterestSubtotalAmt"],
  ["ee_bond_exclusion", "ExcludableSavingsBondIntAmt"],
  ["ordinaryDividends", "TotalOrdinaryDividendsAmt"],
];

function buildIRS1040ScheduleB(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleB", children);
}

export const scheduleB: MefFormDescriptor<"schedule_b", Input> = {
  pendingKey: "schedule_b",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sb.pdf",
  build(fields) {
    return buildIRS1040ScheduleB(fields);
  },
};
