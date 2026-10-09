import { assertArcherEmployerExcessIncomeSource } from "../../../../../domains/adjustments/health/form8853/form8853_contributions_reconciliation.ts";
import { assertEducationIncomeSource } from "../../../../../../nodes/inputs/income/other/education_income/index.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../review-support/form-descriptor.ts";
import { FilingStatus } from "../../../../../../mef/header.ts";
import { assertForm1098Box4Sources } from "../../../../../../nodes/inputs/deductions/mortgage/f1098/index.ts";
import {
  assertForm1099gRtaaSources,
  assertForm1099gTaxableGrantTotal,
  inputSchema as form1099gInputSchema,
} from "../../../../../../nodes/inputs/income/other/f1099g/index.ts";
import { assertSCorpK1CodeJSources } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { schedule1OtherIncomeRows } from "../../../../../mef/forms/income/other/schedule1/schedule1_other_income_rows.ts";
import { schedule1ActivityNotForProfitTotal } from "../../../../../mef/forms/income/other/schedule1/schedule1_nonbusiness_sources.ts";
import { assertPersonalPropertyRentalSource } from "../../../../../domains/income/business/personal-property-rental-source.ts";
import { appendSchedule1OtherIncomeStatement } from "../../../income/other/schedule1/schedule1_other_income_statement.ts";
import { appendSchedule1AlimonyStatement } from "../../../income/other/schedule1/schedule1_alimony_statement.ts";
import { assertTaxableAlimonySchedule1 } from "../../../../../../nodes/inputs/income/other/alimony_received/index.ts";

// IRS Schedule 1 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf
//
// Page 1 (f1_01–f1_38):
//   f1_01–f1_03: name, SSN, and the 2025 Form 1099-K error/loss entry
//   Part I Additional Income:
//     f1_04 = Line 1 state/local refund
//     f1_07 = Line 3 Schedule C
//     f1_08 = Line 4 other gains/losses
//     f1_09 = Line 5 Schedule E
//     f1_10 = Line 6 Schedule F
//     Line7_ReadOrder group → f1_12 = Line 7 unemployment
//     Line8a_ReadOrder group → f1_13 = Line 8a net operating loss
//     f1_14 = Line 8b gambling winnings
//     f1_15 = Line 8c cancellation of debt
//     f1_17 = Line 8e Archer MSA distributions
//     f1_21 = Line 8i prizes and awards
//     f1_28 = Line 8p excess business loss
//     Line8z_ReadOrder group → f1_35 = description, f1_36 = amount
//     f1_37 = Line 9 total other income
//     f1_38 = Line 10 total additional income
//
// Page 2 (f2_01–f2_30):
//   Part II Adjustments:
//     f2_01–f2_08 = Lines 11–18, respectively
//     f2_12 = Line 20 IRA deduction; f2_13 = Line 21 student loan interest
//     f2_15 = Line 23 Archer MSA; f2_21 = Line 24f; f2_26 = Line 24k;
//     f2_30 = Line 26

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "line8r_taxable_scholarships",
    pdfField: "topmostSubform[0].Page1[0].f1_30[0]",
  },
  {
    kind: "text",
    domainKey: "form1099k_reported_error_or_loss",
    pdfField: "topmostSubform[0].Page1[0].f1_03[0]",
  },
  // ── Page 1: Part I Additional Income ────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line1_state_refund",
    pdfField: "topmostSubform[0].Page1[0].f1_04[0]",
  },
  {
    kind: "text",
    domainKey: "line2a_alimony_received",
    pdfField: "topmostSubform[0].Page1[0].f1_05[0]",
  },
  {
    kind: "text",
    domainKey: "print_line2b_alimony_agreement_month",
    pdfField: "topmostSubform[0].Page1[0].f1_06[0]",
  },
  {
    kind: "text",
    domainKey: "line3_schedule_c",
    pdfField: "topmostSubform[0].Page1[0].f1_07[0]",
  },
  {
    kind: "text",
    domainKey: "line4_other_gains",
    pdfField: "topmostSubform[0].Page1[0].f1_08[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_line4_form4797",
    pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
  },
  {
    kind: "text",
    domainKey: "line5_schedule_e",
    pdfField: "topmostSubform[0].Page1[0].f1_09[0]",
  },
  {
    kind: "text",
    domainKey: "line6_schedule_f",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line7_unemployment",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_line7_unemployment_repayment",
    pdfField: "topmostSubform[0].Page1[0].Line7_ReadOrder[0].c1_3[0]",
  },
  {
    kind: "text",
    domainKey: "line7_unemployment_repayment",
    pdfField: "topmostSubform[0].Page1[0].Line7_ReadOrder[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "line8a_nol_deduction",
    pdfField: "topmostSubform[0].Page1[0].Line8a_ReadOrder[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "line8b_gambling_winnings",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "line8c_cod_income",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line8d_foreign_earned_income_exclusion",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "line8e_archer_msa_dist",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line8f_hsa_income",
    pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "line8i_prizes_awards",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "line8j_f1099k_hobby_income",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
  },
  {
    kind: "text",
    domainKey: "line8l_personal_property_rent",
    pdfField: "topmostSubform[0].Page1[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "line8n_section951a_inclusion",
    pdfField: "topmostSubform[0].Page1[0].f1_26[0]",
  },
  {
    kind: "text",
    domainKey: "line8o_section951aa_inclusion",
    pdfField: "topmostSubform[0].Page1[0].f1_27[0]",
  },
  {
    kind: "text",
    domainKey: "line8p_excess_business_loss",
    pdfField: "topmostSubform[0].Page1[0].f1_28[0]",
  },
  {
    kind: "text",
    domainKey: "line8q_able_taxable_earnings",
    pdfField: "topmostSubform[0].Page1[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "line8z_description",
    pdfField: "topmostSubform[0].Page1[0].Line8z_ReadOrder[0].f1_35[0]",
  },
  {
    kind: "text",
    domainKey: "line8z_other",
    pdfField: "topmostSubform[0].Page1[0].f1_36[0]",
  },
  {
    kind: "text",
    domainKey: "line9_total_other_income",
    pdfField: "topmostSubform[0].Page1[0].f1_37[0]",
  },
  {
    kind: "text",
    domainKey: "line10_total_additional_income",
    pdfField: "topmostSubform[0].Page1[0].f1_38[0]",
  },

  // ── Page 2: Part II Adjustments ─────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line11_educator_expenses",
    pdfField: "topmostSubform[0].Page2[0].f2_01[0]",
  },
  {
    kind: "text",
    domainKey: "line12_business_expenses",
    pdfField: "topmostSubform[0].Page2[0].f2_02[0]",
  },
  {
    kind: "text",
    domainKey: "line13_hsa_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_03[0]",
  },
  {
    kind: "text",
    domainKey: "line14_moving_expenses",
    pdfField: "topmostSubform[0].Page2[0].f2_04[0]",
  },
  {
    kind: "text",
    domainKey: "line15_se_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_05[0]",
  },
  {
    kind: "text",
    domainKey: "line16_sep_simple",
    pdfField: "topmostSubform[0].Page2[0].f2_06[0]",
  },
  {
    kind: "text",
    domainKey: "line17_se_health_insurance",
    pdfField: "topmostSubform[0].Page2[0].f2_07[0]",
  },
  {
    kind: "text",
    domainKey: "line18_early_withdrawal",
    pdfField: "topmostSubform[0].Page2[0].f2_08[0]",
  },
  {
    kind: "text",
    domainKey: "line20_ira_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
  {
    kind: "text",
    domainKey: "line21_student_loan_interest",
    pdfField: "topmostSubform[0].Page2[0].f2_13[0]",
  },
  {
    kind: "text",
    domainKey: "line23_archer_msa_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_15[0]",
  },
  {
    kind: "text",
    domainKey: "line24f_501c18d",
    pdfField: "topmostSubform[0].Page2[0].f2_21[0]",
  },
  {
    kind: "text",
    domainKey: "line24b_personal_property_expenses",
    pdfField: "topmostSubform[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "line24k_section67e_excess_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_26[0]",
  },
  {
    kind: "text",
    domainKey: "line25_total_other_adjustments",
    pdfField: "topmostSubform[0].Page2[0].f2_29[0]",
  },
  {
    kind: "text",
    domainKey: "line26_total_adjustments",
    pdfField: "topmostSubform[0].Page2[0].f2_30[0]",
  },
];

export const schedule1Pdf: PdfFormDescriptor = {
  pendingKey: "schedule1",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf",
  filerFields: [
    {
      kind: "text",
      domainKey: "nameShownOnForm1040",
      pdfField: "topmostSubform[0].Page1[0].f1_01[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_02[0]",
    },
  ],
  instances(fields, filer, all) {
    assertArcherEmployerExcessIncomeSource(fields, {
      filer,
      pending: all ?? {},
    });
    assertEducationIncomeSource(
      all,
      [filer?.primarySSN, filer?.spouse?.ssn].filter((s): s is string => !!s),
      fields.line8r_taxable_scholarships,
    );
    const line4 = fields.line4_other_gains;
    const hasLine4 = typeof line4 === "number" && line4 !== 0;
    if (hasLine4 && !all?.form4797) {
      throw new Error(
        "Schedule 1 PDF line 4 needs a retained Form 4797 source; direct Form 4684 reporting is not implemented",
      );
    }
    // Form 4684 instructions reserve its Schedule 1 checkbox for a direct
    // line 31 amount when Form 4797 is otherwise unnecessary. The supported
    // casualty route passes through Form 4797, so only its box is checked.
    const line4Fields = hasLine4 ? { print_line4_form4797: true } : {};
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
        "Form 2555 line 50 housing deduction needs sourced Schedule 1 line 24j; it cannot be added to line 8d PDF",
      );
    }
    const alimony = assertTaxableAlimonySchedule1(
      fields.line2a_alimony_received,
      all?.alimony_received,
      filer
        ? [
          filer.primarySSN,
          ...(filer.filingStatus === FilingStatus.MarriedFilingJointly &&
              filer.spouse?.ssn
            ? [filer.spouse.ssn]
            : []),
        ]
        : undefined,
    );
    const alimonyFields = alimony
      ? {
        print_line2b_alimony_agreement_month: `${
          alimony.agreementMonth.slice(5)
        }/${alimony.agreementMonth.slice(0, 4)}`,
      }
      : {};
    const unemploymentRows = all?.f1099g === undefined
      ? []
      : form1099gInputSchema.parse(all.f1099g).f1099gs;
    const received = unemploymentRows.reduce(
      (sum, row) => sum + (row.box_1_unemployment ?? 0),
      0,
    );
    const repaid = unemploymentRows.reduce(
      (sum, row) => sum + (row.box_1_repaid ?? 0),
      0,
    );
    if (repaid > received) {
      throw new Error(
        "Schedule 1 PDF same-year unemployment repayment exceeds retained current-year benefits",
      );
    }
    if (
      (received > 0 || repaid > 0) &&
      (fields.line7_unemployment ?? 0) !== received - repaid
    ) {
      throw new Error(
        "Schedule 1 PDF line 7 differs from retained unemployment sources",
      );
    }
    const repaymentFields = repaid > 0
      ? {
        print_line7_unemployment_repayment: true,
        line7_unemployment_repayment: repaid,
      }
      : {};
    if (
      Number(fields.line8n_section951a_inclusion ?? 0) > 0 ||
      Number(fields.line8o_section951aa_inclusion ?? 0) > 0
    ) {
      throw new Error(
        "Schedule 1 lines 8n/8o need complete Form 5471 schedules and Form 8992 with Schedule A before PDF export",
      );
    }
    assertPersonalPropertyRentalSource(fields, all, filer);
    if (
      all?.f1098 !== undefined ||
      Number(fields.line8z_f1098_interest_recovery ?? 0) > 0
    ) {
      if (!filer) {
        throw new Error("Schedule 1 PDF Form 1098 box 4 needs filer identity");
      }
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) {
        recipients.push(filer.spouse.ssn);
      }
      assertForm1098Box4Sources(
        all?.f1098,
        recipients,
        Number(fields.line8z_f1098_interest_recovery ?? 0),
      );
    }
    if (
      all?.f1099g !== undefined ||
      Number(fields.line8z_rtaa ?? 0) > 0 ||
      fields.f1099g_rtaa_sources !== undefined ||
      Number(fields.line8z_taxable_grants ?? 0) !== 0 ||
      fields.f1099g_taxable_grant_sources !== undefined
    ) {
      if (!filer) throw new Error("Schedule 1 PDF RTAA needs filer identity");
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) recipients.push(filer.spouse.ssn);
      assertForm1099gRtaaSources(
        all?.f1099g,
        fields.f1099g_rtaa_sources,
        Number(fields.line8z_rtaa ?? 0),
        recipients,
      );
      assertForm1099gTaxableGrantTotal(
        all?.f1099g,
        fields.f1099g_taxable_grant_sources,
        Number(fields.line8z_taxable_grants ?? 0),
        recipients,
      );
    }
    if (
      all?.k1_s_corp !== undefined ||
      Number(fields.line8z_k1_s_corp_tax_benefit_recovery ?? 0) > 0 ||
      fields.k1_s_corp_box10_code_j_sources !== undefined
    ) {
      if (!filer) {
        throw new Error(
          "Schedule 1 PDF S corporation recovery needs filer identity",
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
        all?.k1_s_corp,
        fields.k1_s_corp_box10_code_j_sources,
        Number(fields.line8z_k1_s_corp_tax_benefit_recovery ?? 0),
        recipients,
      );
    }
    const rows = schedule1OtherIncomeRows(fields);
    const activityNotForProfit = schedule1ActivityNotForProfitTotal(fields);
    if (rows.length === 0 && activityNotForProfit === 0) {
      return [{
        ...fields,
        ...line4Fields,
        ...alimonyFields,
        ...repaymentFields,
      }];
    }
    return [{
      ...fields,
      ...line4Fields,
      ...alimonyFields,
      ...repaymentFields,
      ...(activityNotForProfit > 0
        ? { line8j_f1099k_hobby_income: activityNotForProfit }
        : {}),
      ...(rows.length > 0
        ? {
          line8z_other: rows.reduce((sum, row) => sum + row.amount, 0),
          line8z_description: "SEE STATEMENT",
        }
        : {}),
    }];
  },
  async appendSupplementalPages(document, fields, filer, allPending) {
    await appendSchedule1AlimonyStatement(
      document,
      fields,
      filer,
      allPending?.alimony_received,
    );
    await appendSchedule1OtherIncomeStatement(
      document,
      fields,
      filer,
      allPending?.schedule1,
    );
  },
  fields,
};
