import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  net_unearned_income?: number | null;
  parent_taxable_income?: number | null;
  parent_tax?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["net_unearned_income", "ChildNetUnearnedIncomeAmt"],
  ["parent_taxable_income", "ParentTaxableIncomeAmt"],
  ["parent_tax", "ParentTaxAmt"],
];

function buildIRS8615(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8615", children);
}

export const form8615: MefFormDescriptor<"form8615", Input> = {
  pendingKey: "form8615",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8615.pdf",
  build(fields) {
    return buildIRS8615(fields);
  },
};
