import type { Form982Fields, Form982Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form982Fields, string]> = [
  ["line2_excluded_cod", "ExcludedCancelledDebtAmt"],
  ["insolvency_amount", "InsolvencyAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS982(fields: Form982Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS982", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form982MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f982.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS982(pending.form982 ?? {});
  }
}

export const form982 = new Form982MefNode();
