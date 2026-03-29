import { element, elements } from "../xml.ts";

interface Form8880Fields {
  ira_contributions_taxpayer?: number | null;
  ira_contributions_spouse?: number | null;
  elective_deferrals?: number | null;
  elective_deferrals_taxpayer?: number | null;
  elective_deferrals_spouse?: number | null;
  distributions_taxpayer?: number | null;
  distributions_spouse?: number | null;
  agi?: number | null;
  income_tax_liability?: number | null;
}

type Form8880Input = Partial<Form8880Fields> & { [extra: string]: unknown };

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
