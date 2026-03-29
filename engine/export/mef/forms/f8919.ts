import { element, elements } from "../xml.ts";
import type { Form8919Fields, Form8919Input } from "../types.ts";
export type { Form8919Input };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8919Fields, string]> = [
  ["wages", "WagesReceivedAmt"],
  ["prior_ss_wages", "PriorSSWagesAmt"],
];

export function buildIRS8919(fields: Form8919Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8919", children);
}
