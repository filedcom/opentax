import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  foreign_tax_paid?: number | null;
  foreign_income?: number | null;
  total_income?: number | null;
  us_tax_before_credits?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["foreign_tax_paid", "ForeignTaxesPaidOrAccruedAmt"],
  ["foreign_income", "ForeignSourceIncomeAmt"],
  ["total_income", "TotalIncomeAmt"],
  ["us_tax_before_credits", "USTaxBeforeCreditsAmt"],
];

function buildIRS1116(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1116", children);
}

export const form1116: MefFormDescriptor<"form_1116", Input> = {
  pendingKey: "form_1116",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build(fields) {
    return buildIRS1116(fields);
  },
};
