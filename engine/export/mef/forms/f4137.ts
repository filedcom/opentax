import { element, elements } from "../xml.ts";

interface Form4137Fields {
  allocated_tips?: number | null;
  total_tips_received?: number | null;
  reported_tips?: number | null;
  ss_wages_from_w2?: number | null;
}

export type Form4137Input = Partial<Form4137Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form4137Fields, string]> = [
  ["allocated_tips", "AllocatedTipsAmt"],
  ["total_tips_received", "TotalTipsRcvdAmt"],
  ["reported_tips", "TipsReportedToEmployerAmt"],
  ["ss_wages_from_w2", "SocSecWagesFromW2Amt"],
];

export function buildIRS4137(fields: Form4137Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4137", children);
}
