import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  taxable_interest_net?: number | null;
  ee_bond_exclusion?: number | null;
  ordinaryDividends?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

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
