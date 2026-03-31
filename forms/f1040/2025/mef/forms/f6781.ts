import type { Form6781Fields, Form6781Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form6781Fields, string]> = [
  ["net_section_1256_gain", "NetSection1256ContractsAmt"],
  ["prior_year_loss_carryover", "PriorYearLossCarryoverAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS6781(fields: Form6781Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6781", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form6781MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f6781.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS6781(pending.form6781 ?? {});
  }
}

export const form6781 = new Form6781MefNode();
