import type { Form8615Fields, Form8615Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8615Fields, string]> = [
  ["net_unearned_income", "ChildNetUnearnedIncomeAmt"],
  ["parent_taxable_income", "ParentTaxableIncomeAmt"],
  ["parent_tax", "ParentTaxAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8615(fields: Form8615Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8615", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8615MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8615.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8615(pending.form8615 ?? {});
  }
}

export const form8615 = new Form8615MefNode();
