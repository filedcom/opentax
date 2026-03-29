import type { Form2441Fields, Form2441Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form2441Fields, string]> = [
  ["dep_care_benefits", "DependentCareBenefitsAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS2441(fields: Form2441Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS2441", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form2441MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f2441.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS2441(pending.form2441 ?? {});
  }
}

export const form2441 = new Form2441MefNode();
