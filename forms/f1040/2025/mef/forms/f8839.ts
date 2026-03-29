import type { Form8839Fields, Form8839Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8839Fields, string]> = [
  ["adoption_benefits", "AdoptionBenefitsAmt"],
  ["magi", "ModifiedAGIAmt"],
  ["income_tax_liability", "IncomeTaxLiabilityAmt"],
];

function buildIRS8839(fields: Form8839Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8839", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8839MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8839.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8839(pending.form8839 ?? {});
  }
}

export const form8839 = new Form8839MefNode();
