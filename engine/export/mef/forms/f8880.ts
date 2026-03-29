import { element, elements } from "../xml.ts";
import type { Form8880Fields, Form8880Input } from "../types.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8880Fields, string]> = [
  ["ira_contributions_taxpayer", "TxpyrRetirePlanContriAmt"],
  ["ira_contributions_spouse", "SpouseRetirePlanContriAmt"],
  ["elective_deferrals", "ElectiveDeferralAmt"],
  ["elective_deferrals_taxpayer", "TxpyrElectiveDeferralAmt"],
  ["elective_deferrals_spouse", "SpouseElectiveDeferralAmt"],
  ["distributions_taxpayer", "TxpyrDistributionAmt"],
  ["distributions_spouse", "SpouseDistributionAmt"],
  ["agi", "AGIAmt"],
  ["income_tax_liability", "IncomeTaxLiabilityAmt"],
];

export function buildIRS8880(fields: Form8880Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8880", children);
}
