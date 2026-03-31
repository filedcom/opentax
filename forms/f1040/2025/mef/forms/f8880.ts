import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
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

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS8880(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8880", children);
}

export const form8880: MefFormDescriptor<"form8880", Input> = {
  pendingKey: "form8880",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  build(fields) {
    return buildIRS8880(fields);
  },
};
