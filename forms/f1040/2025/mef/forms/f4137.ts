import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  allocated_tips?: number | null;
  total_tips_received?: number | null;
  reported_tips?: number | null;
  ss_wages_from_w2?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["allocated_tips", "AllocatedTipsAmt"],
  ["total_tips_received", "TotalTipsRcvdAmt"],
  ["reported_tips", "TipsReportedToEmployerAmt"],
  ["ss_wages_from_w2", "SocSecWagesFromW2Amt"],
];

function buildIRS4137(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4137", children);
}

export const form4137: MefFormDescriptor<"form4137", Input> = {
  pendingKey: "form4137",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4137.pdf",
  build(fields) {
    return buildIRS4137(fields);
  },
};
