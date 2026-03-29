import type { Form1116Fields, Form1116Input } from "../types.ts";
import { element, elements } from "../xml.ts";

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
