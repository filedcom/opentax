import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  nondeductible_contributions?: number | null;
  prior_basis?: number | null;
  year_end_ira_value?: number | null;
  traditional_distributions?: number | null;
  roth_conversion?: number | null;
  roth_distribution?: number | null;
  roth_basis_contributions?: number | null;
  roth_basis_conversions?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["nondeductible_contributions", "NondeductibleContriAmt"],
  ["prior_basis", "TotalBasisInTraditionalIRAAmt"],
  ["year_end_ira_value", "TraditionalIRAValueAmt"],
  ["traditional_distributions", "TraditionalIRADistriAmt"],
  ["roth_conversion", "RothConversionAmt"],
  ["roth_distribution", "RothIRADistributionAmt"],
  ["roth_basis_contributions", "RothContributionsBasisAmt"],
  ["roth_basis_conversions", "RothConversionBasisAmt"],
];

function buildIRS8606(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8606", children);
}

export const form8606: MefFormDescriptor<"form8606", Input> = {
  pendingKey: "form8606",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8606.pdf",
  build(fields) {
    return buildIRS8606(fields);
  },
};
