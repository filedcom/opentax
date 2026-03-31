import type { Form8880Fields, Form8880Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8880Fields, string]> = [
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

function buildIRS8880(fields: Form8880Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8880", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8880MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8880.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8880(pending.form8880 ?? {});
  }
}

export const form8880 = new Form8880MefNode();
