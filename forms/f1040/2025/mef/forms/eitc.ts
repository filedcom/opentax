import type { EitcFields, EitcInput } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

const FIELD_MAP: ReadonlyArray<readonly [keyof EitcFields, string]> = [
  ["earned_income", "EarnedIncomeAmt"],
  ["agi", "AGIAmt"],
  ["qualifying_children", "QlfyChildCnt"],
  ["investment_income", "InvestmentIncomeAmt"],
];

// --- Builder ------------------------------------------------------------------

function buildIRSEITC(fields: EitcInput): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRSEITC", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class EitcMefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf";
  build(pending: MefFormsPending): string {
    return buildIRSEITC(pending.eitc ?? {});
  }
}

export const eitc = new EitcMefNode();
