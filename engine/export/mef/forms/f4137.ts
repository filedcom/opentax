import type { Form4137Fields, Form4137Input } from "../types.ts";
import { element, elements } from "../xml.ts";
export type { Form4137Input };

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
