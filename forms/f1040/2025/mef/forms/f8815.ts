import type { Form8815Fields, Form8815Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8815Fields, string]> = [
  ["ee_bond_interest", "SavingsBondInterestAmt"],
  ["bond_proceeds", "TotalProceedsAmt"],
  ["qualified_expenses", "QualifiedExpensesAmt"],
  ["modified_agi", "ModifiedAGIAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8815(fields: Form8815Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8815", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8815MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8815.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8815(pending.form8815 ?? {});
  }
}

export const form8815 = new Form8815MefNode();
