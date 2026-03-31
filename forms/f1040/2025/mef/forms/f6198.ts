import type { Form6198Fields, Form6198Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form6198Fields, string]> = [
  ["schedule_c_loss", "OrdinaryLossAmt"],
  ["schedule_f_loss", "FarmLossAmt"],
  ["prior_unallowed", "PriorYearUnallowedLossAmt"],
  ["current_year_income", "CurrentYrIncomeAmt"],
  ["amount_at_risk", "AmountAtRiskAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS6198(fields: Form6198Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS6198", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form6198MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f6198.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS6198(pending.form6198 ?? {});
  }
}

export const form6198 = new Form6198MefNode();
