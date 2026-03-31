import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  dep_care_benefits?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["dep_care_benefits", "DependentCareBenefitsAmt"],
];

function buildIRS2441(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS2441", children);
}

export const form2441: MefFormDescriptor<"form2441", Input> = {
  pendingKey: "form2441",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2441.pdf",
  build(fields) {
    return buildIRS2441(fields);
  },
};
