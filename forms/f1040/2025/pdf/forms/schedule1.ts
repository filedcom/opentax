import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 1 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040s1.pdf
//
// Page 1 (f1_01–f1_38):
//   f1_01–f1_10: personal info, SSN, state/local refund detail (skip header)
//   Part I Additional Income:
//     f1_01 = Line 1 state/local refund
//     f1_03 = Line 3 Schedule C (after SSN f1_02)
//     f1_04 = Line 4 other gains/losses
//     f1_06 = Line 6 Schedule F
//     Line7_ReadOrder group → f1_11 = Line 7 unemployment
//     Line8a_ReadOrder group → f1_13 = Line 8a net operating loss
//     f1_14 = Line 8b gambling winnings
//     f1_15 = Line 8c cancellation of debt
//     f1_17 = Line 8e Archer MSA distributions
//     f1_21 = Line 8i prizes and awards
//     f1_27 = Line 8p excess business loss
//     Line8z_ReadOrder group → f1_35 = Line 8z other income
//     f1_37 = Line 10 total additional income
//
// Page 2 (f2_01–f2_09):
//   Part II Adjustments:
//     f2_02 = Line 13 HSA deduction
//     f2_04 = Line 15 SE health insurance deduction
//     f2_06 = Line 17 deductible SE tax
//     f2_07 = Line 18 penalty on early withdrawal
//     f2_09 = Line 20 IRA deduction

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Page 1: Part I Additional Income ────────────────────────────────────────
  ["line1_state_refund",           "topmostSubform[0].Page1[0].f1_01[0]"],
  ["line3_schedule_c",             "topmostSubform[0].Page1[0].f1_03[0]"],
  ["line4_other_gains",            "topmostSubform[0].Page1[0].f1_04[0]"],
  ["line6_schedule_f",             "topmostSubform[0].Page1[0].f1_06[0]"],
  ["line7_unemployment",           "topmostSubform[0].Page1[0].Line7_ReadOrder[0].f1_11[0]"],
  ["line8c_cod_income",            "topmostSubform[0].Page1[0].f1_15[0]"],
  ["line8e_archer_msa_dist",       "topmostSubform[0].Page1[0].f1_17[0]"],
  ["line8i_prizes_awards",         "topmostSubform[0].Page1[0].f1_21[0]"],
  ["line8p_excess_business_loss",  "topmostSubform[0].Page1[0].f1_27[0]"],
  ["line8z_other",                 "topmostSubform[0].Page1[0].Line8z_ReadOrder[0].f1_35[0]"],

  // ── Page 2: Part II Adjustments ─────────────────────────────────────────────
  ["line13_hsa_deduction",         "topmostSubform[0].Page2[0].f2_02[0]"],
  ["line15_se_deduction",          "topmostSubform[0].Page2[0].f2_04[0]"],
  ["line17_schedule_e",            "topmostSubform[0].Page2[0].f2_06[0]"],
  ["line18_early_withdrawal",      "topmostSubform[0].Page2[0].f2_07[0]"],
  ["line20_ira_deduction",         "topmostSubform[0].Page2[0].f2_09[0]"],
];

export const schedule1Pdf: PdfFormDescriptor = {
  pendingKey: "schedule1",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s1.pdf",
  PDF_FIELD_MAP,
};
