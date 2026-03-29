import { element, elements } from "../xml.ts";
import type { Form8829Fields, Form8829Input } from "../types.ts";
export type { Form8829Input };

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
