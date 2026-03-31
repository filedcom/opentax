import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  excess_business_loss?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["excess_business_loss", "ExcessBusinessLossAmt"],
];

function buildIRS461(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS461", children);
}

export const form461: MefFormDescriptor<"form461", Input> = {
  pendingKey: "form461",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f461.pdf",
  build(fields) {
    return buildIRS461(fields);
  },
};
