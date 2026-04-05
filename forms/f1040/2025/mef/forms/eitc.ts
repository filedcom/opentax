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

// IRS1040ScheduleEIC is optional (minOccurs="0") in ReturnData1040.xsd.
// The XSD only accepts QualifyingChildInformation repeating groups —
// EarnedIncomeAmt and the other Fields are 1040 form elements, not Schedule EIC elements.
// We omit the element entirely: the EITC credit flows through f1040.line27_eitc on the 1040.
function buildIRS1040ScheduleEIC(_fields: Input): string {
  return "";
}

export const eitc: MefFormDescriptor<"eitc", Input> = {
  pendingKey: "eitc",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  build(fields) {
    return buildIRS1040ScheduleEIC(fields);
  },
};
