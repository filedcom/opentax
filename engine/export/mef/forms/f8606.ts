import { element, elements } from "../xml.ts";
import type { Form8606Fields, Form8606Input } from "../types.ts";
export type { Form8606Input };

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

export function buildIRS8606(fields: Form8606Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8606", children);
}
