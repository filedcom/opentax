import { element, elements } from "../xml.ts";

interface Form8919Fields {
  wages?: number | null;
  prior_ss_wages?: number | null;
}

export type Form8919Input = Partial<Form8919Fields> & { [extra: string]: unknown };

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
