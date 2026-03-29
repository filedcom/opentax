import type { Form1116Fields, Form1116Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form1116Fields, string]> = [
  ["foreign_tax_paid", "ForeignTaxesPaidOrAccruedAmt"],
  ["foreign_income", "ForeignSourceIncomeAmt"],
  ["total_income", "TotalIncomeAmt"],
  ["us_tax_before_credits", "USTaxBeforeCreditsAmt"],
];

function buildIRS1116(fields: Form1116Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1116", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form1116MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1116.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1116(pending.form_1116 ?? {});
  }
}

export const form1116 = new Form1116MefNode();
