import type { Form461Fields, Form461Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

const FIELD_MAP: ReadonlyArray<readonly [keyof Form461Fields, string]> = [
  ["excess_business_loss", "ExcessBusinessLossAmt"],
];

// --- Builder ------------------------------------------------------------------

function buildIRS461(fields: Form461Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS461", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form461MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f461.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS461(pending.form461 ?? {});
  }
}

export const form461 = new Form461MefNode();
