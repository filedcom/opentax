import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { assertForm1098Box4Sources } from "../../../nodes/inputs/f1098/index.ts";
import {
  assertForm1099gRtaaSources,
  assertForm1099gTaxableGrantTotal,
} from "../../../nodes/inputs/f1099g/index.ts";
import { assertSCorpK1CodeJSources } from "../../../nodes/inputs/k1_s_corp/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { schedule1OtherIncomeRows } from "./schedule1_other_income_rows.ts";
import { schedule1ActivityNotForProfitTotal } from "./schedule1_nonbusiness_sources.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";
import { assertPersonalPropertyRentalSource } from "../../personal-property-rental-source.ts";
import { assertTaxableAlimonySchedule1 } from "../../../nodes/inputs/alimony_received/index.ts";

export interface Fields {
  form1099k_reported_error_or_loss?: number | null;
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
  line8l_personal_property_rent?: number | null;
  line8n_section951a_inclusion?: number | null;
  line8o_section951aa_inclusion?: number | null;
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
  line24b_personal_property_expenses?: number | null;
  line24k_section67e_excess_deduction?: number | null;
  line25_total_other_adjustments?: number | null;
  line26_total_adjustments?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["form1099k_reported_error_or_loss", "Form1099KRptErrorOrLossAmt"],
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
  ["line8l_personal_property_rent", "RentalIncomePersonalPropAmt"],
  ["line8n_section951a_inclusion", "Section951aInclusionAmt"],
  ["line8o_section951aa_inclusion", "Section951AaInclusionAmt"],
  ["line8p_excess_business_loss", "ExcessBusinessLossAmt"],
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
  ["line24b_personal_property_expenses", "RntlIncmPrsnlPropExpnssDedAmt"],
  ["line24f_501c18d", "Sect501c18DContriDedAmt"],
  ["line24k_section67e_excess_deduction", "Section67eExcessDeductionAmt"],
  ["line25_total_other_adjustments", "TotalOtherAdjustmentsAmt"],
  ["line26_total_adjustments", "TotalAdjustmentsAmt"],
];

function buildIRS1040Schedule1(
  fields: Input,
  context?: MefBuildContext,
): string {
  const alimony = assertTaxableAlimonySchedule1(
    fields.line2a_alimony_received,
    context?.pending?.alimony_received,
    context?.filer
      ? [
        context.filer.primarySSN,
        ...(context.filer.filingStatus === FilingStatus.MarriedFilingJointly &&
            context.filer.spouse?.ssn
          ? [context.filer.spouse.ssn]
          : []),
      ]
      : undefined,
  );
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
    if (key === "line8j_f1099k_hobby_income") {
      const amount = schedule1ActivityNotForProfitTotal(fields);
      return amount > 0 ? element(tag, amount) : "";
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
  if (alimony) {
    children.splice(
      2,
      0,
      ...alimony.agreements.map((agreement) =>
        elements("AlimonyReceivedGrp", [
          element("AlimonyReceivedAmt", agreement.amount),
          element("DivorceOrSeparationAgreementDt", agreement.agreementMonth),
        ])
      ),
      element("TotalAlimonyReceivedAmt", alimony.amount),
    );
  }
  return elements("IRS1040Schedule1", children);
}

export const schedule1: MefFormDescriptor<"schedule1", Input> = {
  pendingKey: "schedule1",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf",
  build(fields, context) {
    if (fields.line8z_nqdc !== undefined) {
      throw new Error(
        "Schedule 1 NQDC income needs an identified W-2 or 1099-NEC source; Form 1099-MISC box 15 is only a section 409A tax base",
      );
    }
    if (
      fields.line8d_foreign_housing_deduction !== undefined &&
      fields.line8d_foreign_housing_deduction !== 0
    ) {
      throw new Error(
        "Form 2555 line 50 housing deduction needs sourced Schedule 1 line 24j; it cannot be added to line 8d",
      );
    }
    if (
      (fields.line8n_section951a_inclusion ?? 0) > 0 ||
      (fields.line8o_section951aa_inclusion ?? 0) > 0
    ) {
      throw new Error(
        "Schedule 1 lines 8n/8o need the complete native Form 5471 schedules and Form 8992 with Schedule A before MeF export",
      );
    }
    assertPersonalPropertyRentalSource(
      fields,
      context?.pending,
      context?.filer,
    );
    if (
      context?.pending?.f1098 !== undefined ||
      (fields.line8z_f1098_interest_recovery ?? 0) > 0
    ) {
      const filer = context?.filer;
      if (!filer) {
        throw new Error("Schedule 1 Form 1098 box 4 needs filer identity");
      }
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) {
        recipients.push(filer.spouse.ssn);
      }
      assertForm1098Box4Sources(
        context?.pending?.f1098,
        recipients,
        fields.line8z_f1098_interest_recovery ?? 0,
      );
    }
    if (
      context?.pending?.f1099g !== undefined ||
      (fields.line8z_rtaa ?? 0) > 0 ||
      fields.f1099g_rtaa_sources !== undefined ||
      (fields.line8z_taxable_grants ?? 0) !== 0 ||
      fields.f1099g_taxable_grant_sources !== undefined
    ) {
      const filer = context?.filer;
      if (!filer) throw new Error("Schedule 1 RTAA needs filer identity");
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) recipients.push(filer.spouse.ssn);
      assertForm1099gRtaaSources(
        context?.pending?.f1099g,
        fields.f1099g_rtaa_sources,
        fields.line8z_rtaa ?? 0,
        recipients,
      );
      assertForm1099gTaxableGrantTotal(
        context?.pending?.f1099g,
        fields.f1099g_taxable_grant_sources,
        fields.line8z_taxable_grants ?? 0,
        recipients,
      );
    }
    if (
      context?.pending?.k1_s_corp !== undefined ||
      (fields.line8z_k1_s_corp_tax_benefit_recovery ?? 0) > 0 ||
      fields.k1_s_corp_box10_code_j_sources !== undefined
    ) {
      const filer = context?.filer;
      if (!filer) {
        throw new Error(
          "Schedule 1 S corporation recovery needs filer identity",
        );
      }
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) {
        recipients.push(filer.spouse.ssn);
      }
      assertSCorpK1CodeJSources(
        context?.pending?.k1_s_corp,
        fields.k1_s_corp_box10_code_j_sources,
        fields.line8z_k1_s_corp_tax_benefit_recovery ?? 0,
        recipients,
      );
    }
    if (
      fields.line25_total_other_adjustments !== undefined &&
      fields.line25_total_other_adjustments !== null &&
      fields.line25_total_other_adjustments !==
        (fields.line24f_501c18d ?? 0) +
          (fields.line24b_personal_property_expenses ?? 0) +
          (fields.line24k_section67e_excess_deduction ?? 0)
    ) {
      throw new Error(
        "Schedule 1 line 25 must equal supported line 24 adjustments",
      );
    }
    const k1Source = context?.pending?.k1_trust;
    const parsedK1 = k1Source === undefined
      ? undefined
      : trustK1InputSchema.parse(k1Source);
    const codeAItems =
      parsedK1?.k1_trusts.filter((item) =>
        item.box11_code_a_section67e_excess_deduction !== undefined
      ) ?? [];
    if (
      codeAItems.length > 0 ||
      (fields.line24k_section67e_excess_deduction ?? 0) > 0
    ) {
      const amount = codeAItems.reduce(
        (sum, item) =>
          sum + (item.box11_code_a_section67e_excess_deduction ?? 0),
        0,
      );
      const filerSsns = [
        context?.filer?.primarySSN,
        context?.filer?.spouse?.ssn,
      ]
        .filter((ssn): ssn is string => ssn !== undefined)
        .map((ssn) => ssn.replaceAll("-", ""));
      const keys = codeAItems.map((item) =>
        `${item.estate_trust_ein}:${item.source_document_reference}`
      );
      if (
        amount === 0 || amount !== fields.line24k_section67e_excess_deduction ||
        new Set(keys).size !== keys.length ||
        codeAItems.some((item) => !filerSsns.includes(item.beneficiary_ssn!))
      ) {
        throw new Error(
          "Schedule 1 line 24k needs distinct final trust K-1 code A sources owned by this return",
        );
      }
    }
    const unsupported = [
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
    // The graph calculates both totals as zero on an ordinary wage-only
    // return. They do not create a Schedule 1 filing instance by themselves.
    // Keep any explicit source key, including a zero unemployment source line.
    const onlyComputedZeroTotals = Object.entries(fields).every(
      ([key, value]) =>
        (key === "line10_total_additional_income" ||
          key === "line26_total_adjustments") && value === 0,
    );
    return onlyComputedZeroTotals ? "" : buildIRS1040Schedule1(fields, context);
  },
};
