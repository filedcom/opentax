import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_state_refund?: number | null;
  line3_schedule_c?: number | null;
  line4_other_gains?: number | null;
  line6_schedule_f?: number | null;
  line7_unemployment?: number | null;
  line8c_cod_income?: number | null;
  line8d_foreign_earned_income_exclusion?: number | null;
  line8e_archer_msa_dist?: number | null;
  line8f_hsa_income?: number | null;
  line8i_prizes_awards?: number | null;
  line8p_excess_business_loss?: number | null;
  line8z_rtaa?: number | null;
  line8z_taxable_grants?: number | null;
  line8z_substitute_payments?: number | null;
  line8z_attorney_proceeds?: number | null;
  line8z_nqdc?: number | null;
  line8z_other?: number | null;
  line8z_form8814?: number | null;
  line8z_hsa_excess_earnings?: number | null;
  line8z_hsa_excess_employer?: number | null;
  line8z_golden_parachute?: number | null;
  line9_total_other_income?: number | null;
  line10_total_additional_income?: number | null;
  line13_hsa_deduction?: number | null;
  line15_se_deduction?: number | null;
  line5_schedule_e?: number | readonly number[] | null;
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
  ["line5_schedule_e", "RentalRealEstateIncomeLossAmt"],
  ["line6_schedule_f", "NetFarmProfitLossAmt"],
  ["line7_unemployment", "UnemploymentCompAmt"],
  ["line8c_cod_income", "DebtCancellationAmt"],
  ["line8d_foreign_earned_income_exclusion", "TotalIncomeExclusionAmt"],
  ["line8e_archer_msa_dist", "TotArcherMSAMedcrLTCAmt"],
  ["line8f_hsa_income", "TotHSADistriHDHPAmt"],
  ["line8i_prizes_awards", "PrizeAwardAmt"],
  ["line8p_excess_business_loss", "ExcessBusinessLossAmt"],
  ["line8z_rtaa", "RTAAPaymentsAmt"],
  ["line8z_taxable_grants", "TaxableGrantsAmt"],
  ["line8z_substitute_payments", "SubstitutePaymentsAmt"],
  ["line8z_attorney_proceeds", "GrossProeedsToAttorneyAmt"],
  ["line8z_nqdc", "NQDCDistributionAmt"],
  ["line8z_other", "OtherIncomeAmt"],
  ["line8z_golden_parachute", "ExcessGoldenParachuteAmt"],
  ["line9_total_other_income", "TotalOtherIncomeAmt"],
  ["line10_total_additional_income", "TotalAdditionalIncomeAmt"],
  ["line13_hsa_deduction", "HealthSavingsAccountDedAmt"],
  ["line15_se_deduction", "DeductibleSelfEmploymentTaxAmt"],
  ["line18_early_withdrawal", "EarlyWithdrawalPenaltyAmt"],
  ["line20_ira_deduction", "IRADeductionAmt"],
  ["line23_archer_msa_deduction", "ArcherMSADeductionAmt"],
  ["line24f_501c18d", "Sec501c18dContributionAmt"],
];

function buildIRS1040Schedule1(
  fields: Input,
  context?: MefBuildContext,
): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (key === "line5_schedule_e" && Array.isArray(value)) {
      return element(
        tag,
        value.reduce((sum: number, amount: number) => sum + amount, 0),
      );
    }
    if (key === "line8z_other") {
      const form8814 = fields.line8z_form8814;
      const hsaEarnings = fields.line8z_hsa_excess_earnings;
      const hsaEmployer = fields.line8z_hsa_excess_employer;
      if (
        typeof value !== "number" && typeof form8814 !== "number" &&
        typeof hsaEarnings !== "number" &&
        typeof hsaEmployer !== "number"
      ) return "";
      return element(
        tag,
        (typeof value === "number" ? value : 0) +
          (typeof form8814 === "number" ? form8814 : 0) +
          (typeof hsaEarnings === "number" ? hsaEarnings : 0) +
          (typeof hsaEmployer === "number" ? hsaEmployer : 0),
      );
    }
    if (typeof value !== "number") return "";
    if (key === "line8d_foreign_earned_income_exclusion") {
      const formId = context?.documentIdsByPendingKey?.form2555?.[0];
      return element(
        tag,
        value,
        formId
          ? { referenceDocumentId: formId, referenceDocumentName: "IRS2555" }
          : undefined,
      );
    }
    if (key === "line8f_hsa_income") {
      const formIds = context?.documentIdsByPendingKey?.form8889 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 1 line 8f needs an attached Form 8889");
      }
      return element(
        tag,
        value,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8889",
          }
          : undefined,
      );
    }
    return element(tag, value);
  });
  return elements("IRS1040Schedule1", children);
}

export const schedule1: MefFormDescriptor<"schedule1", Input> = {
  pendingKey: "schedule1",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf",
  build(fields, context) {
    return buildIRS1040Schedule1(fields, context);
  },
};
