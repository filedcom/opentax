import type { Form4684Fields, Form4684Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form4684Fields, string]> = [
  ["personal_fmv_before", "PersonalUsePropFMVBfrCsltyAmt"],
  ["personal_fmv_after", "PersonalUsePropFMVAftrCsltyAmt"],
  ["personal_basis", "CostOrOtherBasisPersonalUseAmt"],
  ["personal_insurance", "InsuranceReimbursementAmt"],
  ["agi", "AGIAmt"],
  ["business_fmv_before", "BusinessFMVBeforeCasualtyAmt"],
  ["business_fmv_after", "BusinessFMVAfterCasualtyAmt"],
  ["business_basis", "CostOrOthBasisBusinessPropAmt"],
  ["business_insurance", "BusInsuranceReimbursementAmt"],
];

// --- Builder ------------------------------------------------------------------

function buildIRS4684(fields: Form4684Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4684", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form4684MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4684.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS4684(pending.form4684 ?? {});
  }
}

export const form4684 = new Form4684MefNode();
