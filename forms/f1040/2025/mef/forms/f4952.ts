import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  investment_interest_expense?: number | null;
  net_investment_income?: number | null;
  prior_year_carryforward?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["investment_interest_expense", "InvestmentInterestExpenseAmt"],
  ["net_investment_income", "NetInvestmentIncomeAmt"],
  ["prior_year_carryforward", "PYDisallowedInvstIntExpAmt"],
];

function buildIRS4952(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4952", children);
}

export const form4952: MefFormDescriptor<"form4952", Input> = {
  pendingKey: "form4952",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4952.pdf",
  build(fields) {
    return buildIRS4952(fields);
  },
};
