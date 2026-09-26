import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1?: number | null;
  line2?: number | null;
  line3?: number | null;
  line4a?: number | null;
  line4b?: number | null;
  line4c?: number | null;
  line4d?: number | null;
  line4e?: number | null;
  line4f?: number | null;
  line4g?: number | null;
  line4h?: number | null;
  line5?: number | null;
  line6?: number | null;
  line7?: number | null;
  line8?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Exact sequence and names from TY2025v5.4 IRS4952.xsd.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1", "InvestmentInterestExpenseAmt"],
  ["line2", "PriorYrDisallowInvsmtIntExpAmt"],
  ["line3", "TotalInvestmentInterestExpAmt"],
  ["line4a", "InvestmentPropGrossIncomeAmt"],
  ["line4b", "InvestmentPropQualDividendsAmt"],
  ["line4c", "InvestmentPropNetGrossIncAmt"],
  ["line4d", "InvestmentPropNetDispGainAmt"],
  ["line4e", "PropertyDspstnCapGainInvIncAmt"],
  ["line4f", "InvestmentNetGainLessSmallAmt"],
  ["line4g", "InvestmentIncomeElectionAmt"],
  ["line4h", "InvestmentIncomeAmt"],
  ["line5", "InvestmentExpenseAmt"],
  ["line6", "NetInvestmentIncomeAmt"],
  ["line7", "DisallowedCarryForwardExpAmt"],
  ["line8", "InvestmentInterestExpDeductAmt"],
];

export const form4952: MefFormDescriptor<"form4952", Input> = {
  pendingKey: "form4952",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  build(fields) {
    return elements(
      "IRS4952",
      FIELD_MAP.map(([key, tag]) => {
        const value = fields[key];
        return typeof value === "number" ? element(tag, value) : "";
      }),
    );
  },
};
