import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  lump_sum_amount?: number | null;
  capital_gain_amount?: number | null;
  death_benefit_exclusion?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["lump_sum_amount", "LumpSumDistriAmt"],
  ["capital_gain_amount", "CapitalGainAmt"],
  ["death_benefit_exclusion", "DeathBenefitExclusionAmt"],
];

function buildIRS4972(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4972", children);
}

export const form4972: MefFormDescriptor<"form4972", Input> = {
  pendingKey: "form4972",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4972.pdf",
  build(fields) {
    return buildIRS4972(fields);
  },
};
