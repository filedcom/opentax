import type { Form2555Fields, Form2555Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form2555Fields, string]> = [
  ["foreign_wages", "ForeignEarnedIncWagesAmt"],
  ["foreign_self_employment_income", "ForeignEarnedIncSelfEmplAmt"],
  ["days_in_foreign_country", "PhysicalPresenceDaysCnt"],
  ["foreign_housing_expenses", "ForeignHousingExpensesAmt"],
  ["employer_housing_exclusion", "EmployerHousingExclusionAmt"],
];

// --- Builder ------------------------------------------------------------------

function buildIRS2555(fields: Form2555Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS2555", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form2555MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f2555.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS2555(pending.form2555 ?? {});
  }
}

export const form2555 = new Form2555MefNode();
