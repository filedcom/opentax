import type { Form8396Fields, Form8396Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8396Fields, string]> = [
  ["mortgage_interest_paid", "MortgageInterestPaidAmt"],
  ["mcc_rate", "MCCCreditRateDecimalNum"],
  ["prior_year_credit_carryforward", "PriorYearCreditCarryforwardAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8396(fields: Form8396Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8396", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8396MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8396.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8396(pending.form8396 ?? {});
  }
}

export const form8396 = new Form8396MefNode();
