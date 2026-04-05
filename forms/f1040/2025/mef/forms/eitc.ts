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

// IRS1040ScheduleEIC only applies when there are qualifying children.
// The XSD defines child-info sub-elements only — EarnedIncomeAmt and AGIAmt
// are internal computation fields, not IRS1040ScheduleEIC elements.
// Return "" for zero-children scenarios so the element is omitted entirely.
function buildIRS1040ScheduleEIC(fields: Input): string {
  const children = Number(fields["qualifying_children"]) ?? 0;
  if (children <= 0) return "";
  const mappedChildren = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040ScheduleEIC", mappedChildren);
}

export const eitc: MefFormDescriptor<"eitc", Input> = {
  pendingKey: "eitc",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  build(fields) {
    return buildIRS1040ScheduleEIC(fields);
  },
};
