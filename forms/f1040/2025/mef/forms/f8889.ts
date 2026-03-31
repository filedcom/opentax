import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  taxpayer_hsa_contributions?: number | null;
  employer_hsa_contributions?: number | null;
  hsa_distributions?: number | null;
  qualified_medical_expenses?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["taxpayer_hsa_contributions", "HSAContributionAmt"],
  ["employer_hsa_contributions", "HSAEmployerContributionAmt"],
  ["hsa_distributions", "TotalHSADistributionAmt"],
  ["qualified_medical_expenses", "UnreimbQualMedAndDentalExpAmt"],
];

function buildIRS8889(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8889", children);
}

export const form8889: MefFormDescriptor<"form8889", Input> = {
  pendingKey: "form8889",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8889.pdf",
  build(fields) {
    return buildIRS8889(fields);
  },
};
