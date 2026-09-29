import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { schedule1OtherIncomeRows } from "../../mef/forms/schedule1_other_income_rows.ts";

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
//     f2_15 = Line 23 Archer MSA; f2_25 = Line 24f; f2_30 = Line 26

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Page 1: Part I Additional Income ────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line1_state_refund",
    pdfField: "topmostSubform[0].Page1[0].f1_04[0]",
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
    domainKey: "line8p_excess_business_loss",
    pdfField: "topmostSubform[0].Page1[0].f1_28[0]",
  },
  {
    kind: "text",
    domainKey: "line8z_nqdc",
    pdfField: "topmostSubform[0].Page1[0].f1_32[0]",
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
    domainKey: "line26_total_adjustments",
    pdfField: "topmostSubform[0].Page2[0].f2_30[0]",
  },
];

export const schedule1Pdf: PdfFormDescriptor = {
  pendingKey: "schedule1",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
  ],
  instances(fields) {
    const rows = schedule1OtherIncomeRows(fields);
    if (rows.length === 0) return [fields];
    return [{
      ...fields,
      line8z_other: rows.reduce((sum, row) => sum + row.amount, 0),
      line8z_description: rows.map((row) =>
        row.label === "FORM 8814" ? "Form 8814" : row.label
      ).join(", "),
    }];
  },
  fields,
};
