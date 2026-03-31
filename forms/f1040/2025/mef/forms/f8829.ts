import type { Form8829Fields, Form8829Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8829Fields, string]> = [
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

function buildIRS8829(fields: Form8829Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS8829", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8829MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8829.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8829(pending.form_8829 ?? {});
  }
}

export const form8829 = new Form8829MefNode();
