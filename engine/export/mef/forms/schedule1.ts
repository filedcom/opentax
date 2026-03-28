import { element, elements } from "../xml.ts";

const FIELD_MAP: [string, string][] = [
  ["line1_state_refund", "StateLocalTaxRefundAmt"],
  ["line3_schedule_c", "BusinessIncomeLossAmt"],
  ["line7_unemployment", "UnemploymentCompAmt"],
  ["line8i_prizes_awards", "PrizeAwardAmt"],
  ["line8z_rtaa", "RTAAPaymentsAmt"],
  ["line8z_taxable_grants", "TaxableGrantsAmt"],
  ["line8z_substitute_payments", "SubstitutePaymentsAmt"],
  ["line8z_attorney_proceeds", "GrossProeedsToAttorneyAmt"],
  ["line8z_nqdc", "NQDCDistributionAmt"],
  ["line8z_other", "OtherIncomeAmt"],
  ["line8z_golden_parachute", "ExcessGoldenParachuteAmt"],
  ["line8c_cod_income", "CancellationOfDebtAmt"],
  ["line17_schedule_e", "RentalRealEstateIncomeLossAmt"],
  ["line18_early_withdrawal", "EarlyWithdrawalPenaltyAmt"],
  ["line24f_501c18d", "Sec501c18dContributionAmt"],
];

export function buildIRS1040Schedule1(fields: Record<string, unknown>): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (value === undefined || value === null) return "";
    return element(tag, value as number);
  });
  return elements("IRS1040Schedule1", children);
}
