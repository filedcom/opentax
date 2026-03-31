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

function buildIRS8959(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8959", children);
}

export const form8959: MefFormDescriptor<"form8959", Input> = {
  pendingKey: "form8959",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8959.pdf",
  build(fields) {
    return buildIRS8959(fields);
  },
};
