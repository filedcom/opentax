import type { Form4797Fields, Form4797Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form4797Fields, string]> = [
  ["section_1231_gain", "Section1231GainLossAmt"],
  ["nonrecaptured_1231_loss", "Nonrecaptured1231LossAmt"],
  ["ordinary_gain", "OrdinaryGainLossAmt"],
  ["recapture_1245", "Section1245DepreciationAmt"],
  ["recapture_1250", "Section1250DepreciationAmt"],
];

function buildIRS4797(fields: Form4797Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4797", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form4797MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4797.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS4797(pending.form4797 ?? {});
  }
}

export const form4797 = new Form4797MefNode();
