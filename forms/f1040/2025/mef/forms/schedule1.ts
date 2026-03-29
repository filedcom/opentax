import type { Schedule1Fields, Schedule1Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

const FIELD_MAP: ReadonlyArray<readonly [keyof Schedule1Fields, string]> = [
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

function buildIRS1040Schedule1(fields: Schedule1Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS1040Schedule1", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Schedule1MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040Schedule1(pending.schedule1 ?? {});
  }
}

export const schedule1 = new Schedule1MefNode();
