import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  mortgage_interest_paid?: number | null;
  mcc_rate?: number | null;
  prior_year_credit_carryforward?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["mortgage_interest_paid", "MortgageInterestPaidAmt"],
  ["mcc_rate", "MCCCreditRateDecimalNum"],
  ["prior_year_credit_carryforward", "PriorYearCreditCarryforwardAmt"],
];

function buildIRS8396(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8396", children);
}

export const form8396: MefFormDescriptor<"form8396", Input> = {
  pendingKey: "form8396",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8396.pdf",
  build(fields) {
    return buildIRS8396(fields);
  },
};
