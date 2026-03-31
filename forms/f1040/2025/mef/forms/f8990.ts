import type { Form8990Fields, Form8990Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8990Fields, string]> = [
  ["business_interest_expense", "BusinessInterestExpenseAmt"],
  ["prior_disallowed_carryforward", "PriorYearDisallowedBIEAmt"],
  ["floor_plan_interest", "FloorPlanFinancingIntAmt"],
  ["tentative_taxable_income", "TentativeTaxableIncomeAmt"],
  ["depreciation_amortization", "DepreciationAmortizationAmt"],
  ["business_interest_income", "BusinessInterestIncomeAmt"],
  ["avg_gross_receipts", "AvgAnnualGrossReceiptsAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8990(fields: Form8990Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8990", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8990MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8990.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8990(pending.form8990 ?? {});
  }
}

export const form8990 = new Form8990MefNode();
