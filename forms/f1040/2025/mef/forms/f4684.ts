import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  personal_fmv_before?: number | null;
  personal_fmv_after?: number | null;
  personal_basis?: number | null;
  personal_insurance?: number | null;
  agi?: number | null;
  business_fmv_before?: number | null;
  business_fmv_after?: number | null;
  business_basis?: number | null;
  business_insurance?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS4684(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4684", children);
}

export const form4684: MefFormDescriptor<"form4684", Input> = {
  pendingKey: "form4684",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4684.pdf",
  build(fields) {
    return buildIRS4684(fields);
  },
};
