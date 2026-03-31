import type { Form8959Fields, Form8959Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8959Fields, string]> = [
  ["medicare_wages", "TotalW2MedicareWagesAndTipsAmt"],
  ["unreported_tips", "TotalUnreportedMedicareTipsAmt"],
  ["wages_8919", "TotalWagesWithNoWithholdingAmt"],
  ["se_income", "TotalSelfEmploymentIncomeAmt"],
  ["rrta_wages", "TotalRailroadRetirementCompAmt"],
  ["medicare_withheld", "TotalW2MedicareTaxWithheldAmt"],
  ["rrta_medicare_withheld", "TotalW2AddlRRTTaxAmt"],
];

function buildIRS8959(fields: Form8959Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8959", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8959MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8959.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8959(pending.form8959 ?? {});
  }
}

export const form8959 = new Form8959MefNode();
