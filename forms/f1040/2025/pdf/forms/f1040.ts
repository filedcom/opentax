import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1040 (2025) AcroForm field names.
// Verified empirically by filling each field with a unique value and inspecting the output.
//
// Page 1 layout (f1_XX):
//   f1_14–f1_19:  primary taxpayer name/SSN, spouse name/SSN
//   f1_20–f1_24:  address (line1, apt, city, state, zip)
//   f1_47–f1_57:  wages (lines 1a–1z)
//                 f1_54 = line 1h description text (not a dollar field — skipped)
//   f1_58–f1_75:  income lines 2–11 (interest, dividends, IRA, pension, SS, capital gains, AGI)
//                 f1_64 = QCD sub-field (skipped), f1_67 = PSO sub-field (skipped),
//                 f1_71 = near line 7b check area (skipped)
//   Lines 12–15 appear on page 2 only in the 2025 form.
//
// Page 2 layout (f2_XX):
//   f2_01:        line 11b — AGI carry from page 1
//   f2_02–f2_06:  lines 12–15 — deductions & taxable income
//                 f2_02 = line 12 (std/itemized), f2_03 = line 13a QBI,
//                 f2_04 = line 13b (new 2025), f2_05 = line 14, f2_06 = line 15
//   f2_07:        line 16 form-name text box (not a dollar field — skipped)
//   f2_08–f2_16:  tax lines 16–24 (shifted +1 vs pre-2025 descriptor)
//   f2_17–f2_21:  withholding lines 25a–26 (shifted +1)
//   f2_22:        SSN field (skipped)
//   f2_23–f2_31:  payments lines 27a–35a
//   f2_32:        line 37 amount owed

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Page 1: Filing Status (Line 1 checkboxes) ─────────────────────────────
  { kind: "checkboxWhen", domainKey: "filing_status", pdfField: "topmostSubform[0].Page1[0].c1_1[0]", whenValue: "single" },
  { kind: "checkboxWhen", domainKey: "filing_status", pdfField: "topmostSubform[0].Page1[0].c1_2[0]", whenValue: "mfj" },
  { kind: "checkboxWhen", domainKey: "filing_status", pdfField: "topmostSubform[0].Page1[0].c1_3[0]", whenValue: "mfs" },
  { kind: "checkboxWhen", domainKey: "filing_status", pdfField: "topmostSubform[0].Page1[0].c1_4[0]", whenValue: "hoh" },
  { kind: "checkboxWhen", domainKey: "filing_status", pdfField: "topmostSubform[0].Page1[0].c1_5[0]", whenValue: "qss" },

  // ── Page 1: Wages (Lines 1a–1z) ───────────────────────────────────────────
  { kind: "text", domainKey: "line1a_wages",                    pdfField: "topmostSubform[0].Page1[0].f1_47[0]" },
  { kind: "text", domainKey: "line1b_household_wages",          pdfField: "topmostSubform[0].Page1[0].f1_48[0]" },
  { kind: "text", domainKey: "line1c_unreported_tips",          pdfField: "topmostSubform[0].Page1[0].f1_49[0]" },
  { kind: "text", domainKey: "line1d_medicaid_waiver",          pdfField: "topmostSubform[0].Page1[0].f1_50[0]" },
  { kind: "text", domainKey: "line1e_taxable_dep_care",         pdfField: "topmostSubform[0].Page1[0].f1_51[0]" },
  { kind: "text", domainKey: "line1f_taxable_adoption_benefits",pdfField: "topmostSubform[0].Page1[0].f1_52[0]" },
  { kind: "text", domainKey: "line1g_wages_8919",               pdfField: "topmostSubform[0].Page1[0].f1_53[0]" },
  // f1_54 = line 1h description text — not a dollar field, skipped
  { kind: "text", domainKey: "line1h_other_earned",             pdfField: "topmostSubform[0].Page1[0].f1_55[0]" },
  { kind: "text", domainKey: "line1i_combat_pay",               pdfField: "topmostSubform[0].Page1[0].f1_56[0]" },
  { kind: "text", domainKey: "line1z_total_wages",              pdfField: "topmostSubform[0].Page1[0].f1_57[0]" },

  // ── Page 1: Income (Lines 2–11) ───────────────────────────────────────────
  // f1_64 = QCD sub-field (line 4 sub-item), f1_67 = PSO sub-field (line 5 sub-item),
  // f1_71 = near line 7b checkbox area — all three skipped.
  { kind: "text", domainKey: "line2a_tax_exempt",               pdfField: "topmostSubform[0].Page1[0].f1_58[0]" },
  { kind: "text", domainKey: "line2b_taxable_interest",         pdfField: "topmostSubform[0].Page1[0].f1_59[0]" },
  { kind: "text", domainKey: "line3a_qualified_dividends",      pdfField: "topmostSubform[0].Page1[0].f1_60[0]" },
  { kind: "text", domainKey: "line3b_ordinary_dividends",       pdfField: "topmostSubform[0].Page1[0].f1_61[0]" },
  { kind: "text", domainKey: "line4a_ira_gross",                pdfField: "topmostSubform[0].Page1[0].f1_62[0]" },
  { kind: "text", domainKey: "line4b_ira_taxable",              pdfField: "topmostSubform[0].Page1[0].f1_63[0]" },
  // f1_64 skipped (QCD sub-field)
  { kind: "text", domainKey: "line5a_pension_gross",            pdfField: "topmostSubform[0].Page1[0].f1_65[0]" },
  { kind: "text", domainKey: "line5b_pension_taxable",          pdfField: "topmostSubform[0].Page1[0].f1_66[0]" },
  // f1_67 skipped (PSO sub-field)
  { kind: "text", domainKey: "line6a_ss_gross",                 pdfField: "topmostSubform[0].Page1[0].f1_68[0]" },
  { kind: "text", domainKey: "line6b_ss_taxable",               pdfField: "topmostSubform[0].Page1[0].f1_69[0]" },
  // Line 7: only one of the two keys is set per return
  { kind: "text", domainKey: "line7_capital_gain",              pdfField: "topmostSubform[0].Page1[0].f1_70[0]" },
  { kind: "text", domainKey: "line7a_cap_gain_distrib",         pdfField: "topmostSubform[0].Page1[0].f1_70[0]" },
  // f1_71 skipped (near line 7b check area)
  { kind: "text", domainKey: "line8_additional_income",         pdfField: "topmostSubform[0].Page1[0].f1_72[0]" },
  { kind: "text", domainKey: "line9_total_income",              pdfField: "topmostSubform[0].Page1[0].f1_73[0]" },
  { kind: "text", domainKey: "line10_adjustments",              pdfField: "topmostSubform[0].Page1[0].f1_74[0]" },
  { kind: "text", domainKey: "line11_agi",                      pdfField: "topmostSubform[0].Page1[0].f1_75[0]", extraPdfFields: ["topmostSubform[0].Page2[0].f2_01[0]"] },

  // ── Page 2: Deductions (Lines 12–15) ─────────────────────────────────────
  // Lines 12–15 are page 2 only in the 2025 form.
  // Line 12a: standard deduction written first; itemized overwrites if non-zero.
  { kind: "text", domainKey: "line12a_standard_deduction",      pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
  { kind: "text", domainKey: "line12e_itemized_deductions",     pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
  // f2_03 = line 13a QBI deduction
  { kind: "text", domainKey: "line13_qbi_deduction",            pdfField: "topmostSubform[0].Page2[0].f2_03[0]" },
  // f2_04 = line 13b (new 2025 — additional deductions from Schedule A-1 line 38); no domain key yet
  { kind: "text", domainKey: "line14_deductions_qbi_total",     pdfField: "topmostSubform[0].Page2[0].f2_05[0]" },
  { kind: "text", domainKey: "line15_taxable_income",           pdfField: "topmostSubform[0].Page2[0].f2_06[0]" },

  // ── Page 2: Tax and Credits (Lines 16–24) ────────────────────────────────
  // f2_07 = line 16 form-name text box (not a dollar field — skipped).
  // All tax lines shifted +1 vs the pre-2025 descriptor.
  { kind: "text", domainKey: "line16_income_tax",               pdfField: "topmostSubform[0].Page2[0].f2_08[0]" },
  { kind: "text", domainKey: "line17_additional_taxes",         pdfField: "topmostSubform[0].Page2[0].f2_09[0]" },
  { kind: "text", domainKey: "line18_total_tax_before_credits", pdfField: "topmostSubform[0].Page2[0].f2_10[0]" },
  { kind: "text", domainKey: "line19_child_tax_credit",         pdfField: "topmostSubform[0].Page2[0].f2_11[0]" },
  { kind: "text", domainKey: "line20_nonrefundable_credits",    pdfField: "topmostSubform[0].Page2[0].f2_12[0]" },
  { kind: "text", domainKey: "line21_credits_total",            pdfField: "topmostSubform[0].Page2[0].f2_13[0]" },
  { kind: "text", domainKey: "line22_tax_after_credits",        pdfField: "topmostSubform[0].Page2[0].f2_14[0]" },
  { kind: "text", domainKey: "line23_other_taxes",              pdfField: "topmostSubform[0].Page2[0].f2_15[0]" },
  { kind: "text", domainKey: "line24_total_tax",                pdfField: "topmostSubform[0].Page2[0].f2_16[0]" },

  // ── Page 2: Payments (Lines 25a–33) ──────────────────────────────────────
  // All payment lines shifted +1. f2_22 = SSN field — skipped.
  { kind: "text", domainKey: "line25a_w2_withheld",             pdfField: "topmostSubform[0].Page2[0].f2_17[0]" },
  { kind: "text", domainKey: "line25b_withheld_1099",           pdfField: "topmostSubform[0].Page2[0].f2_18[0]" },
  { kind: "text", domainKey: "line25c_additional_medicare_withheld", pdfField: "topmostSubform[0].Page2[0].f2_19[0]" },
  { kind: "text", domainKey: "line25d_total_withholding",       pdfField: "topmostSubform[0].Page2[0].f2_20[0]" },
  { kind: "text", domainKey: "line26_estimated_tax",            pdfField: "topmostSubform[0].Page2[0].f2_21[0]" },
  // f2_22 skipped (SSN field)
  { kind: "text", domainKey: "line27_eitc",                     pdfField: "topmostSubform[0].Page2[0].f2_23[0]" },
  { kind: "text", domainKey: "line28_actc",                     pdfField: "topmostSubform[0].Page2[0].f2_24[0]" },
  { kind: "text", domainKey: "line29_refundable_aoc",           pdfField: "topmostSubform[0].Page2[0].f2_25[0]" },
  { kind: "text", domainKey: "line30_refundable_adoption",      pdfField: "topmostSubform[0].Page2[0].f2_26[0]" },
  { kind: "text", domainKey: "line31_additional_payments",      pdfField: "topmostSubform[0].Page2[0].f2_27[0]" },
  { kind: "text", domainKey: "line32_refundable_credits_total", pdfField: "topmostSubform[0].Page2[0].f2_28[0]" },
  { kind: "text", domainKey: "line33_total_payments",           pdfField: "topmostSubform[0].Page2[0].f2_29[0]" },

  // ── Page 2: Refund / Amount Owed (Lines 34–37) ────────────────────────────
  { kind: "text", domainKey: "line34_overpayment",              pdfField: "topmostSubform[0].Page2[0].f2_30[0]" },
  { kind: "text", domainKey: "line35a_refund",                  pdfField: "topmostSubform[0].Page2[0].f2_31[0]" },
  { kind: "text", domainKey: "line37_amount_owed",              pdfField: "topmostSubform[0].Page2[0].f2_35[0]" },
];

export const irs1040Pdf: PdfFormDescriptor = {
  pendingKey: "f1040",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  fields,
  filerFields: [
    // domainKey uses dot-notation to traverse FilerIdentity (resolved in builder).
    // ── Primary taxpayer ────────────────────────────────────────────────────
    // Field numbers verified against 2025 IRS f1040.pdf AcroForm layer.
    // f1_14 = "Your first name and middle initial", f1_15 = "Last name", f1_16 = SSN (maxLen=9)
    { kind: "text", domainKey: "firstName",      pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
    { kind: "text", domainKey: "lastName",       pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
    { kind: "text", domainKey: "primarySSN",     pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
    // ── Spouse ──────────────────────────────────────────────────────────────
    // f1_17 = "Spouse's first name and middle initial", f1_18 = "Last name", f1_19 = spouse SSN
    { kind: "text", domainKey: "spouse.firstName", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
    { kind: "text", domainKey: "spouse.lastName",  pdfField: "topmostSubform[0].Page1[0].f1_18[0]" },
    { kind: "text", domainKey: "spouse.ssn",       pdfField: "topmostSubform[0].Page1[0].f1_19[0]" },
    // ── Address ─────────────────────────────────────────────────────────────
    { kind: "text", domainKey: "address.line1",  pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_20[0]" },
    { kind: "text", domainKey: "address.city",   pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_22[0]" },
    { kind: "text", domainKey: "address.state",  pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_23[0]" },
    { kind: "text", domainKey: "address.zip",    pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_24[0]" },
  ],
};
