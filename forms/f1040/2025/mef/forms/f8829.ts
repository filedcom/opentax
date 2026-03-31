import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  total_area?: number | null;
  business_area?: number | null;
  mortgage_interest?: number | null;
  insurance?: number | null;
  rent?: number | null;
  repairs_maintenance?: number | null;
  utilities?: number | null;
  other_expenses?: number | null;
  gross_income_limit?: number | null;
  prior_year_operating_carryover?: number | null;
  home_fmv_or_basis?: number | null;
  prior_year_depreciation_carryover?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["total_area", "TotalAreaOfHomeSqFtCnt"],
  ["business_area", "BusinessAreaOfHomeSqFtCnt"],
  ["mortgage_interest", "MortgageInterestAmt"],
  ["insurance", "InsuranceAmt"],
  ["rent", "RentAmt"],
  ["repairs_maintenance", "RepairsAndMaintenanceAmt"],
  ["utilities", "UtilitiesAmt"],
  ["other_expenses", "OtherExpensesAmt"],
  ["gross_income_limit", "GrossIncomeLimitAmt"],
  ["prior_year_operating_carryover", "PYOperatingExpensesCyovAmt"],
  ["home_fmv_or_basis", "HomeFMVOrAdjBasisAmt"],
  ["prior_year_depreciation_carryover", "PYDepreciationCyovAmt"],
];

function buildIRS8829(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8829", children);
}

export const form8829: MefFormDescriptor<"form_8829", Input> = {
  pendingKey: "form_8829",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8829.pdf",
  build(fields) {
    return buildIRS8829(fields);
  },
};
