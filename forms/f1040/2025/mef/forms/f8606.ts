import type { Form8606Fields, Form8606Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8606Fields, string]> = [
  ["nondeductible_contributions", "NondeductibleContriAmt"],
  ["prior_basis", "TotalBasisInTraditionalIRAAmt"],
  ["year_end_ira_value", "TraditionalIRAValueAmt"],
  ["traditional_distributions", "TraditionalIRADistriAmt"],
  ["roth_conversion", "RothConversionAmt"],
  ["roth_distribution", "RothIRADistributionAmt"],
  ["roth_basis_contributions", "RothContributionsBasisAmt"],
  ["roth_basis_conversions", "RothConversionBasisAmt"],
];

function buildIRS8606(fields: Form8606Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8606", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8606MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8606.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8606(pending.form8606 ?? {});
  }
}

export const form8606 = new Form8606MefNode();
