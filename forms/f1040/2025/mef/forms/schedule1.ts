import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_state_refund?: number | null;
  line3_schedule_c?: number | null;
  line4_other_gains?: number | null;
  line6_schedule_f?: number | null;
  line7_unemployment?: number | null;
  line8c_cod_income?: number | null;
  line8e_archer_msa_dist?: number | null;
  line8i_prizes_awards?: number | null;
  line8p_excess_business_loss?: number | null;
  line8z_rtaa?: number | null;
  line8z_taxable_grants?: number | null;
  line8z_substitute_payments?: number | null;
  line8z_attorney_proceeds?: number | null;
  line8z_nqdc?: number | null;
  line8z_other?: number | null;
  line8z_golden_parachute?: number | null;
  line13_hsa_deduction?: number | null;
  line15_se_deduction?: number | null;
  line17_schedule_e?: number | null;
  line18_early_withdrawal?: number | null;
  line20_ira_deduction?: number | null;
  line23_archer_msa_deduction?: number | null;
  line24f_501c18d?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1_state_refund", "StateLocalTaxRefundAmt"],
  ["line3_schedule_c", "BusinessIncomeLossAmt"],
  ["line4_other_gains", "OtherGainLossAmt"],
  ["line6_schedule_f", "NetFarmProfitLossAmt"],
  ["line7_unemployment", "UnemploymentCompAmt"],
  ["line8c_cod_income", "CancellationOfDebtAmt"],
  ["line8e_archer_msa_dist", "TotArcherMSAMedcrLTCAmt"],
  ["line8i_prizes_awards", "PrizeAwardAmt"],
  ["line8p_excess_business_loss", "ExcessBusinessLossAmt"],
  ["line8z_rtaa", "RTAAPaymentsAmt"],
  ["line8z_taxable_grants", "TaxableGrantsAmt"],
  ["line8z_substitute_payments", "SubstitutePaymentsAmt"],
  ["line8z_attorney_proceeds", "GrossProeedsToAttorneyAmt"],
  ["line8z_nqdc", "NQDCDistributionAmt"],
  ["line8z_other", "OtherIncomeAmt"],
  ["line8z_golden_parachute", "ExcessGoldenParachuteAmt"],
  ["line13_hsa_deduction", "HealthSavingsAccountDedAmt"],
  ["line15_se_deduction", "DeductibleSelfEmploymentTaxAmt"],
  ["line17_schedule_e", "RentalRealEstateIncomeLossAmt"],
  ["line18_early_withdrawal", "EarlyWithdrawalPenaltyAmt"],
  ["line20_ira_deduction", "IRADeductionAmt"],
  ["line23_archer_msa_deduction", "ArcherMSADeductionAmt"],
  ["line24f_501c18d", "Sec501c18dContributionAmt"],
];

function buildIRS1040Schedule1(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040Schedule1", children);
}

export const schedule1: MefFormDescriptor<"schedule1", Input> = {
  pendingKey: "schedule1",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf",
  build(fields) {
    return buildIRS1040Schedule1(fields);
  },
};
