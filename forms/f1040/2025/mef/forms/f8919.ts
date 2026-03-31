import type { Form8919Fields, Form8919Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8919Fields, string]> = [
  ["wages", "WagesReceivedAmt"],
  ["prior_ss_wages", "PriorSSWagesAmt"],
];

function buildIRS8919(fields: Form8919Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8919", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8919MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8919.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8919(pending.form8919 ?? {});
  }
}

export const form8919 = new Form8919MefNode();
