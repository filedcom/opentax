import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  earned_income?: number | null;
  agi?: number | null;
  qualifying_children?: number | null;
  investment_income?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["earned_income", "EarnedIncomeAmt"],
  ["agi", "AGIAmt"],
  ["qualifying_children", "QlfyChildCnt"],
  ["investment_income", "InvestmentIncomeAmt"],
];

function buildIRSEITC(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRSEITC", children);
}

export const eitc: MefFormDescriptor<"eitc", Input> = {
  pendingKey: "eitc",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  build(fields) {
    return buildIRSEITC(fields);
  },
};
