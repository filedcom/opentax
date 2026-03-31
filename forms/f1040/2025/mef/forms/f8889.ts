import type { Form8889Fields, Form8889Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// ─── Field Map ────────────────────────────────────────────────────────────────

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8889Fields, string]> = [
  ["taxpayer_hsa_contributions", "HSAContributionAmt"],
  ["employer_hsa_contributions", "HSAEmployerContributionAmt"],
  ["hsa_distributions", "TotalHSADistributionAmt"],
  ["qualified_medical_expenses", "UnreimbQualMedAndDentalExpAmt"],
];

// ─── Builder ──────────────────────────────────────────────────────────────────

function buildIRS8889(fields: Form8889Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8889", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8889MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8889.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8889(pending.form8889 ?? {});
  }
}

export const form8889 = new Form8889MefNode();
