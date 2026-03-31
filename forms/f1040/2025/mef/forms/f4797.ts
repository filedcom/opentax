import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  section_1231_gain?: number | null;
  nonrecaptured_1231_loss?: number | null;
  ordinary_gain?: number | null;
  recapture_1245?: number | null;
  recapture_1250?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["section_1231_gain", "Section1231GainLossAmt"],
  ["nonrecaptured_1231_loss", "Nonrecaptured1231LossAmt"],
  ["ordinary_gain", "OrdinaryGainLossAmt"],
  ["recapture_1245", "Section1245DepreciationAmt"],
  ["recapture_1250", "Section1250DepreciationAmt"],
];

function buildIRS4797(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4797", children);
}

export const form4797: MefFormDescriptor<"form4797", Input> = {
  pendingKey: "form4797",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4797.pdf",
  build(fields) {
    return buildIRS4797(fields);
  },
};
