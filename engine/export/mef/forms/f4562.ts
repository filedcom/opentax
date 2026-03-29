import { element, elements } from "../xml.ts";

interface Form4562Fields {
  section_179_deduction?: number | null;
  section_179_cost?: number | null;
  section_179_elected?: number | null;
  section_179_carryover?: number | null;
  business_income_limit?: number | null;
  bonus_depreciation_basis?: number | null;
  bonus_depreciation_basis_post_jan19?: number | null;
  macrs_gds_basis?: number | null;
  macrs_gds_recovery_period?: number | null;
  macrs_gds_year_of_service?: number | null;
  macrs_prior_depreciation?: number | null;
  business_use_pct?: number | null;
}

type Form4562Input = Partial<Form4562Fields> & { [extra: string]: unknown };

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
