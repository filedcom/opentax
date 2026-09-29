import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { schedule1OtherIncomeRows } from "./schedule1_other_income_rows.ts";

export interface Fields {
  line1_state_refund?: number | null;
  line3_schedule_c?: number | null;
  line4_other_gains?: number | null;
  line6_schedule_f?: number | null;
  line7_unemployment?: number | null;
  line8b_gambling_winnings?: number | null;
  line8a_nol_deduction?: number | null;
  line8c_cod_income?: number | null;
  line8d_foreign_earned_income_exclusion?: number | null;
  line8e_archer_msa_dist?: number | null;
  line8f_hsa_income?: number | null;
  line8i_prizes_awards?: number | null;
  line8j_f1099k_hobby_income?: number | null;
  line8p_excess_business_loss?: number | null;
  line8z_rtaa?: number | null;
  line8z_taxable_grants?: number | null;
  line8z_substitute_payments?: number | null;
  line8z_attorney_proceeds?: number | null;
  line8z_nqdc?: number | null;
  line8z_other?: number | null;
  line8z_other_income?: number | null;
  line8z_form8621_qef?: number | null;
  line8z_form8621_mtm?: number | null;
  line8z_form8621_section1291?: number | null;
  line8z_f1099nec_nonbusiness?: number | null;
  line8z_f1098_interest_recovery?: number | null;
  line8z_k1_s_corp_tax_benefit_recovery?: number | null;
  line8z_form8814?: number | null;
  line8z_hsa_excess_earnings?: number | null;
  line8z_hsa_excess_employer?: number | null;
  line8z_golden_parachute?: number | null;
  at_risk_disallowed_add_back?: number | null;
  at_risk_recapture?: number | null;
  biz_interest_disallowed_add_back?: number | null;
  line9_total_other_income?: number | null;
  line10_total_additional_income?: number | null;
  line11_educator_expenses?: number | null;
  line12_business_expenses?: number | null;
  line13_hsa_deduction?: number | null;
  line14_moving_expenses?: number | null;
  line15_se_deduction?: number | null;
  line16_sep_simple?: number | null;
  line17_se_health_insurance?: number | null;
  line5_schedule_e?: number | readonly number[] | null;
  line18_early_withdrawal?: number | null;
  line21_student_loan_interest?: number | null;
  line20_ira_deduction?: number | null;
  line23_archer_msa_deduction?: number | null;
  line24f_501c18d?: number | null;
  line26_total_adjustments?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1_state_refund", "StateLocalIncomeTaxRefundAmt"],
  ["line3_schedule_c", "BusinessIncomeLossAmt"],
  ["line4_other_gains", "OtherGainLossAmt"],
  ["line5_schedule_e", "RentalRealEstateIncomeLossAmt"],
  ["line6_schedule_f", "NetFarmProfitLossAmt"],
  ["line7_unemployment", "UnemploymentCompAmt"],
  ["line8a_nol_deduction", "NetOperatingLossDeductionAmt"],
  ["line8b_gambling_winnings", "GamblingReportableWinningAmt"],
  ["line8c_cod_income", "DebtCancellationAmt"],
  ["line8d_foreign_earned_income_exclusion", "TotalIncomeExclusionAmt"],
  ["line8e_archer_msa_dist", "TotArcherMSAMedcrLTCAmt"],
  ["line8f_hsa_income", "TotHSADistriHDHPAmt"],
  ["line8i_prizes_awards", "PrizesAwardsAmt"],
  ["line8j_f1099k_hobby_income", "ActivityNotForProfitIncmAmt"],
  ["line8p_excess_business_loss", "ExcessBusinessLossAmt"],
  ["line8z_nqdc", "NonqlfyDeferredCompensationAmt"],
  ["line8z_other", "OtherIncomeTotalAmt"],
  ["line9_total_other_income", "TotalOtherIncomeAmt"],
  ["line10_total_additional_income", "TotalAdditionalIncomeAmt"],
  ["line11_educator_expenses", "EducatorExpensesAmt"],
  ["line12_business_expenses", "BusExpnsReservistsAndOthersAmt"],
  ["line13_hsa_deduction", "HealthSavingsAccountDedAmt"],
  ["line14_moving_expenses", "MovingExpenseAmt"],
  ["line15_se_deduction", "DeductibleSelfEmploymentTaxAmt"],
  ["line16_sep_simple", "SelfEmpldSepSimpleQlfyPlansAmt"],
  ["line17_se_health_insurance", "SelfEmpldHealthInsDedAmt"],
  ["line18_early_withdrawal", "PnltyOnErlyWthdrwOfSavingsAmt"],
  ["line20_ira_deduction", "IRADeductionAmt"],
  ["line21_student_loan_interest", "StudentLoanInterestDedAmt"],
  ["line23_archer_msa_deduction", "ArcherMSADeductionAmt"],
  ["line24f_501c18d", "Sect501c18DContriDedAmt"],
  ["line26_total_adjustments", "TotalAdjustmentsAmt"],
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
      const rows = schedule1OtherIncomeRows(fields);
      if (rows.length === 0) return "";
      const ids = context?.documentIdsByPendingKey
        ?.schedule1_other_income_statement ?? [];
      if (context?.documentIdsByPendingKey && ids.length !== 1) {
        throw new Error(
          "Schedule 1 line 8z needs its linked other-income type statement",
        );
      }
      return element(
        tag,
        rows.reduce((sum, row) => sum + row.amount, 0),
        ids.length === 1
          ? {
            referenceDocumentId: ids[0],
            referenceDocumentName: "OtherIncomeTypeStatement",
          }
          : undefined,
      );
    }
    if (typeof value !== "number") return "";
    if (key === "line8a_nol_deduction") return element(tag, -value);
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
    if (key === "line12_business_expenses") {
      const formIds = context?.documentIdsByPendingKey?.f2106 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 1 line 12 needs attached Forms 2106");
      }
      return element(
        tag,
        value,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS2106",
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
    const unsupported = [
      "line2a_alimony_received",
      "line8g_child_interest_dividends",
      "line8z_attorney_proceeds",
      "line13_depreciation",
      "line24h_dpad",
    ];
    if (
      unsupported.some((key) =>
        typeof fields[key] === "number" && fields[key] !== 0
      )
    ) {
      throw new Error(
        "Schedule 1 source needs its TY2025 line identity and required supporting facts before MeF export",
      );
    }
    return buildIRS1040Schedule1(fields, context);
  },
};
