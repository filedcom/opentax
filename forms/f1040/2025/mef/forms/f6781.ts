import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  net_section_1256_gain?: number | null;
  prior_year_loss_carryover?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_section_1256_gain", "NetSection1256ContractsAmt"],
  ["prior_year_loss_carryover", "PriorYearLossCarryoverAmt"],
];

function buildIRS6781(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6781", children);
}

export const form6781: MefFormDescriptor<"form6781", Input> = {
  pendingKey: "form6781",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6781.pdf",
  build(fields) {
    return buildIRS6781(fields);
  },
};
