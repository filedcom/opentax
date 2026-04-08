import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1040 (2025) AcroForm field names.
// Verified by inspecting https://www.irs.gov/pub/irs-pdf/f1040.pdf with pdf-lib.
//
// Page 1 layout:
//   f1_01:        year / pre-printed header
//   f1_02–f1_03:  primary taxpayer name
//   f1_04:        primary SSN
//   f1_05–f1_07:  spouse name + SSN
//   f1_08–f1_19:  MFS/HOH spouse/qualifying person names, digital assets, etc.
//   f1_20–f1_27:  address
//   f1_28–f1_30:  standard deduction notations
//   f1_31–f1_46:  dependents table (4 rows × 4 columns)
//   f1_47–f1_56:  wages (lines 1a–1z)
//   f1_57–f1_75:  income lines 2–15

// Page 2 layout:
//   f2_01:        SSN header
//   c2_1–c2_8:   tax method checkboxes (line 16 sub-items)
//   f2_02–f2_10:  tax lines 16–24
//   f2_11–f2_14:  Schedule 2 additional tax sub-items
//   f2_15–f2_27:  payments (lines 25a–33)
//   f2_28–f2_31:  refund / amount owed (lines 34–37)
//   f2_32–f2_51:  bank account, third-party designee, signatures

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Page 1: Wages (Lines 1a–1z) ───────────────────────────────────────────
  { kind: "text", domainKey: "line1a_wages",                    pdfField: "topmostSubform[0].Page1[0].f1_47[0]" },
  { kind: "text", domainKey: "line1b_household_wages",          pdfField: "topmostSubform[0].Page1[0].f1_48[0]" },
  { kind: "text", domainKey: "line1c_unreported_tips",          pdfField: "topmostSubform[0].Page1[0].f1_49[0]" },
  { kind: "text", domainKey: "line1d_medicaid_waiver",          pdfField: "topmostSubform[0].Page1[0].f1_50[0]" },
  { kind: "text", domainKey: "line1e_taxable_dep_care",         pdfField: "topmostSubform[0].Page1[0].f1_51[0]" },
  { kind: "text", domainKey: "line1f_taxable_adoption_benefits",pdfField: "topmostSubform[0].Page1[0].f1_52[0]" },
  { kind: "text", domainKey: "line1g_wages_8919",               pdfField: "topmostSubform[0].Page1[0].f1_53[0]" },
  { kind: "text", domainKey: "line1h_other_earned",             pdfField: "topmostSubform[0].Page1[0].f1_54[0]" },
  { kind: "text", domainKey: "line1i_combat_pay",               pdfField: "topmostSubform[0].Page1[0].f1_55[0]" },
  { kind: "text", domainKey: "line1z_total_wages",              pdfField: "topmostSubform[0].Page1[0].f1_56[0]" },

  // ── Page 1: Income (Lines 2–9) ────────────────────────────────────────────
  { kind: "text", domainKey: "line2a_tax_exempt",               pdfField: "topmostSubform[0].Page1[0].f1_57[0]" },
  { kind: "text", domainKey: "line2b_taxable_interest",         pdfField: "topmostSubform[0].Page1[0].f1_58[0]" },
  { kind: "text", domainKey: "line3a_qualified_dividends",      pdfField: "topmostSubform[0].Page1[0].f1_59[0]" },
  { kind: "text", domainKey: "line3b_ordinary_dividends",       pdfField: "topmostSubform[0].Page1[0].f1_60[0]" },
  { kind: "text", domainKey: "line4a_ira_gross",                pdfField: "topmostSubform[0].Page1[0].f1_61[0]" },
  { kind: "text", domainKey: "line4b_ira_taxable",              pdfField: "topmostSubform[0].Page1[0].f1_62[0]" },
  { kind: "text", domainKey: "line5a_pension_gross",            pdfField: "topmostSubform[0].Page1[0].f1_63[0]" },
  { kind: "text", domainKey: "line5b_pension_taxable",          pdfField: "topmostSubform[0].Page1[0].f1_64[0]" },
  { kind: "text", domainKey: "line6a_ss_gross",                 pdfField: "topmostSubform[0].Page1[0].f1_65[0]" },
  { kind: "text", domainKey: "line6b_ss_taxable",               pdfField: "topmostSubform[0].Page1[0].f1_66[0]" },
  // Line 7: only one of the two keys is set per return
  { kind: "text", domainKey: "line7_capital_gain",              pdfField: "topmostSubform[0].Page1[0].f1_67[0]" },
  { kind: "text", domainKey: "line7a_cap_gain_distrib",         pdfField: "topmostSubform[0].Page1[0].f1_67[0]" },
  { kind: "text", domainKey: "line8_additional_income",         pdfField: "topmostSubform[0].Page1[0].f1_68[0]" },
  { kind: "text", domainKey: "line9_total_income",              pdfField: "topmostSubform[0].Page1[0].f1_69[0]" },

  // ── Page 1: AGI & Deductions (Lines 10–15) ────────────────────────────────
  { kind: "text", domainKey: "line10_adjustments",              pdfField: "topmostSubform[0].Page1[0].f1_70[0]" },
  { kind: "text", domainKey: "line11_agi",                      pdfField: "topmostSubform[0].Page1[0].f1_71[0]" },
  // Line 12a: standard deduction written first; itemized overwrites if non-zero.
  // Zero values are skipped (IRS convention: leave blank rather than print "0").
  { kind: "text", domainKey: "line12a_standard_deduction",      pdfField: "topmostSubform[0].Page1[0].f1_72[0]" },
  { kind: "text", domainKey: "line12e_itemized_deductions",     pdfField: "topmostSubform[0].Page1[0].f1_72[0]" },
  { kind: "text", domainKey: "line12b_charitable",              pdfField: "topmostSubform[0].Page1[0].f1_73[0]" },
  { kind: "text", domainKey: "line13_qbi_deduction",            pdfField: "topmostSubform[0].Page1[0].f1_74[0]" },
  { kind: "text", domainKey: "line15_taxable_income",           pdfField: "topmostSubform[0].Page1[0].f1_75[0]" },

  // ── Page 2: Tax and Credits (Lines 16–24) ────────────────────────────────
  { kind: "text", domainKey: "line16_income_tax",               pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
  { kind: "text", domainKey: "line17_additional_taxes",         pdfField: "topmostSubform[0].Page2[0].f2_03[0]" },
  { kind: "text", domainKey: "line18_total_tax_before_credits", pdfField: "topmostSubform[0].Page2[0].f2_04[0]" },
  { kind: "text", domainKey: "line19_child_tax_credit",         pdfField: "topmostSubform[0].Page2[0].f2_05[0]" },
  { kind: "text", domainKey: "line20_nonrefundable_credits",    pdfField: "topmostSubform[0].Page2[0].f2_06[0]" },
  { kind: "text", domainKey: "line21_credits_total",            pdfField: "topmostSubform[0].Page2[0].f2_07[0]" },
  { kind: "text", domainKey: "line22_tax_after_credits",        pdfField: "topmostSubform[0].Page2[0].f2_08[0]" },
  { kind: "text", domainKey: "line23_other_taxes",              pdfField: "topmostSubform[0].Page2[0].f2_09[0]" },
  { kind: "text", domainKey: "line24_total_tax",                pdfField: "topmostSubform[0].Page2[0].f2_10[0]" },

  // ── Page 2: Payments (Lines 25a–33) ──────────────────────────────────────
  { kind: "text", domainKey: "line25a_w2_withheld",             pdfField: "topmostSubform[0].Page2[0].f2_15[0]" },
  { kind: "text", domainKey: "line25b_withheld_1099",           pdfField: "topmostSubform[0].Page2[0].f2_16[0]" },
  { kind: "text", domainKey: "line25c_additional_medicare_withheld", pdfField: "topmostSubform[0].Page2[0].f2_17[0]" },
  { kind: "text", domainKey: "line26_estimated_tax",            pdfField: "topmostSubform[0].Page2[0].f2_19[0]" },
  { kind: "text", domainKey: "line27_eitc",                     pdfField: "topmostSubform[0].Page2[0].f2_20[0]" },
  { kind: "text", domainKey: "line28_actc",                     pdfField: "topmostSubform[0].Page2[0].f2_23[0]" },
  { kind: "text", domainKey: "line29_refundable_aoc",           pdfField: "topmostSubform[0].Page2[0].f2_24[0]" },
  { kind: "text", domainKey: "line30_refundable_adoption",      pdfField: "topmostSubform[0].Page2[0].f2_25[0]" },
  { kind: "text", domainKey: "line31_additional_payments",      pdfField: "topmostSubform[0].Page2[0].f2_26[0]" },
  { kind: "text", domainKey: "line33_total_payments",           pdfField: "topmostSubform[0].Page2[0].f2_27[0]" },

  // ── Page 2: Refund / Amount Owed (Lines 34–37) ────────────────────────────
  { kind: "text", domainKey: "line34_overpayment",              pdfField: "topmostSubform[0].Page2[0].f2_28[0]" },
  { kind: "text", domainKey: "line35a_refund",                  pdfField: "topmostSubform[0].Page2[0].f2_29[0]" },
  { kind: "text", domainKey: "line37_amount_owed",              pdfField: "topmostSubform[0].Page2[0].f2_31[0]" },
];

export const irs1040Pdf: PdfFormDescriptor = {
  pendingKey: "f1040",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  fields,
  filerFields: [
    // domainKey uses dot-notation to traverse FilerIdentity (resolved in builder).
    // ── Primary taxpayer ────────────────────────────────────────────────────
    { kind: "text", domainKey: "firstName",      pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
    { kind: "text", domainKey: "lastName",       pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
    { kind: "text", domainKey: "primarySSN",     pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
    // ── Spouse ──────────────────────────────────────────────────────────────
    { kind: "text", domainKey: "spouse.firstName", pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
    { kind: "text", domainKey: "spouse.lastName",  pdfField: "topmostSubform[0].Page1[0].f1_06[0]" },
    { kind: "text", domainKey: "spouse.ssn",       pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
    // ── Address ─────────────────────────────────────────────────────────────
    { kind: "text", domainKey: "address.line1",  pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_20[0]" },
    { kind: "text", domainKey: "address.city",   pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_22[0]" },
    { kind: "text", domainKey: "address.state",  pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_23[0]" },
    { kind: "text", domainKey: "address.zip",    pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_24[0]" },
  ],
};
