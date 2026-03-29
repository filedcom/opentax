import { element, elements } from "../xml.ts";

interface Form1116Fields {
  foreign_tax_paid?: number | null;
  foreign_income?: number | null;
  total_income?: number | null;
  us_tax_before_credits?: number | null;
}

type Form1116Input = Partial<Form1116Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form1116Fields, string]> = [
  ["foreign_tax_paid", "ForeignTaxesPaidOrAccruedAmt"],
  ["foreign_income", "ForeignSourceIncomeAmt"],
  ["total_income", "TotalIncomeAmt"],
  ["us_tax_before_credits", "USTaxBeforeCreditsAmt"],
];

export function buildIRS1116(fields: Form1116Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1116", children);
}
