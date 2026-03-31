import type { Form4952Fields, Form4952Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form4952Fields, string]> = [
  ["investment_interest_expense", "InvestmentInterestExpenseAmt"],
  ["net_investment_income", "NetInvestmentIncomeAmt"],
  ["prior_year_carryforward", "PYDisallowedInvstIntExpAmt"],
];

// --- Builder ------------------------------------------------------------------

function buildIRS4952(fields: Form4952Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4952", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form4952MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4952.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS4952(pending.form4952 ?? {});
  }
}

export const form4952 = new Form4952MefNode();
