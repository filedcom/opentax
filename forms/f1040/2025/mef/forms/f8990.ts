import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  business_interest_expense?: number | null;
  prior_disallowed_carryforward?: number | null;
  floor_plan_interest?: number | null;
  tentative_taxable_income?: number | null;
  depreciation_amortization?: number | null;
  business_interest_income?: number | null;
  avg_gross_receipts?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["business_interest_expense", "BusinessInterestExpenseAmt"],
  ["prior_disallowed_carryforward", "PriorYearDisallowedBIEAmt"],
  ["floor_plan_interest", "FloorPlanFinancingIntAmt"],
  ["tentative_taxable_income", "TentativeTaxableIncomeAmt"],
  ["depreciation_amortization", "DepreciationAmortizationAmt"],
  ["business_interest_income", "BusinessInterestIncomeAmt"],
  ["avg_gross_receipts", "AvgAnnualGrossReceiptsAmt"],
];

function buildIRS8990(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8990", children);
}

export const form8990: MefFormDescriptor<"form8990", Input> = {
  pendingKey: "form8990",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8990.pdf",
  build(fields) {
    return buildIRS8990(fields);
  },
};
