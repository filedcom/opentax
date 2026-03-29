import type { ScheduleBFields, ScheduleBInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof ScheduleBFields, string]> = [
  ["taxable_interest_net", "TotalInterestAmt"],
  ["ee_bond_exclusion", "ExcludibleSavingsBondIntAmt"],
  ["ordinaryDividends", "TotalOrdinaryDividendsAmt"],
];

function buildIRS1040ScheduleB(fields: ScheduleBInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleB", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class ScheduleBMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sb.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040ScheduleB(pending.schedule_b ?? {});
  }
}

export const scheduleB = new ScheduleBMefNode();
