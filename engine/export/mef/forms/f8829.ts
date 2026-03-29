import { element, elements } from "../xml.ts";

interface Form8829Fields {
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

export type Form8829Input = Partial<Form8829Fields> & { [extra: string]: unknown };

const FIELD_MAP: ReadonlyArray<readonly [keyof Form8829Fields, string]> = [
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

export function buildIRS8829(fields: Form8829Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8829", children);
}
