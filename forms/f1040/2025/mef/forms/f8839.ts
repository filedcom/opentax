import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  adoption_benefits?: number | null;
  magi?: number | null;
  income_tax_liability?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["adoption_benefits", "AdoptionBenefitsAmt"],
  ["magi", "ModifiedAGIAmt"],
  ["income_tax_liability", "IncomeTaxLiabilityAmt"],
];

function buildIRS8839(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8839", children);
}

export const form8839: MefFormDescriptor<"form8839", Input> = {
  pendingKey: "form8839",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8839.pdf",
  build(fields) {
    return buildIRS8839(fields);
  },
};
