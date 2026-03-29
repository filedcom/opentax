import { element, elements } from "../xml.ts";
import type { Form8839Fields, Form8839Input } from "../types.ts";
export type { Form8839Input };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8839Fields, string]> = [
  ["adoption_benefits", "AdoptionBenefitsAmt"],
  ["magi", "ModifiedAGIAmt"],
  ["income_tax_liability", "IncomeTaxLiabilityAmt"],
];

export function buildIRS8839(fields: Form8839Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8839", children);
}
