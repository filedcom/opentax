import type { Form4137Fields, Form4137Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form4137Fields, string]> = [
  ["allocated_tips", "AllocatedTipsAmt"],
  ["total_tips_received", "TotalTipsRcvdAmt"],
  ["reported_tips", "TipsReportedToEmployerAmt"],
  ["ss_wages_from_w2", "SocSecWagesFromW2Amt"],
];

function buildIRS4137(fields: Form4137Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4137", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form4137MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4137.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS4137(pending.form4137 ?? {});
  }
}

export const form4137 = new Form4137MefNode();
