import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  wages?: number | null;
  prior_ss_wages?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["wages", "WagesReceivedAmt"],
  ["prior_ss_wages", "PriorSSWagesAmt"],
];

function buildIRS8919(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8919", children);
}

export const form8919: MefFormDescriptor<"form8919", Input> = {
  pendingKey: "form8919",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8919.pdf",
  build(fields) {
    return buildIRS8919(fields);
  },
};
