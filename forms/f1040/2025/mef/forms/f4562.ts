import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
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

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
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

function buildIRS4562(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS4562", children);
}

export const form4562: MefFormDescriptor<"form4562", Input> = {
  pendingKey: "form4562",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4562.pdf",
  build(fields) {
    return buildIRS4562(fields);
  },
};
