import type { Form4562Fields, Form4562Input } from "../types.ts";
import { element, elements } from "../xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Form4562Fields, string]> = [
  ["section_179_deduction", "Section179DeductionAmt"],
  ["section_179_cost", "Section179CostAmt"],
  ["section_179_elected", "Section179ElectedCostAmt"],
  ["section_179_carryover", "Section179CarryoverAmt"],
  ["business_income_limit", "BusinessIncomeLimitAmt"],
  ["bonus_depreciation_basis", "BonusDepreciationBasisAmt"],
  ["bonus_depreciation_basis_post_jan19", "BonusDeprecBasisPostJan19Amt"],
  ["macrs_gds_basis", "MACRSGDSBasisAmt"],
  ["macrs_gds_recovery_period", "MACRSGDSRecoveryPeriodAmt"],
  ["macrs_gds_year_of_service", "MACRSGDSYearOfServiceAmt"],
  ["macrs_prior_depreciation", "MACRSPriorDepreciationAmt"],
  ["business_use_pct", "BusinessUsePct"],
];

export function buildIRS4562(fields: Form4562Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4562", children);
}
