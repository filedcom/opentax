import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1040 (2025) AcroForm field names.
// Verified by inspecting https://www.irs.gov/pub/irs-pdf/f1040.pdf with pdf-lib.
//
// Page 1 layout (text fields f1_01 – f1_75):
//   f1_01–f1_19: personal info (names, SSNs)
//   f1_20–f1_27: address
//   f1_28–f1_30: filing status / standard deduction notations
//   f1_31–f1_46: dependent table (4 rows × 4 columns)
//   f1_47–f1_75: income lines 1a–15 and above-the-line adjustments
//
// Page 2 layout (text fields f2_01 – f2_51):
//   f2_01:        SSN header
//   f2_02–f2_09:  tax lines 16–24
//   f2_10–f2_14:  credits / tax after credits
//   f2_15–f2_21:  payments section (withholding, estimated, EITC)
//   f2_22:        SSN (ReadOrder group)
//   f2_23–f2_30:  refundable credits, total payments
//   f2_31–f2_51:  refund / amount owed, third-party designee, signatures

// Maps domain field name → full IRS AcroForm field name.
// Only income/tax/payment fields that the engine computes are included.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Page 1: Income ──────────────────────────────────────────────────────────
  ["line1a_wages",                  "topmostSubform[0].Page1[0].f1_47[0]"],
  // f1_48 = line 1b (household employee wages — not mapped)
  ["line1c_unreported_tips",        "topmostSubform[0].Page1[0].f1_49[0]"],
  // f1_50 = line 1d (medicaid waiver — not mapped)
  ["line1e_taxable_dep_care",       "topmostSubform[0].Page1[0].f1_51[0]"],
  ["line1f_taxable_adoption_benefits", "topmostSubform[0].Page1[0].f1_52[0]"],
  ["line1g_wages_8919",             "topmostSubform[0].Page1[0].f1_53[0]"],
  // f1_54 = line 1h (other income — not mapped)
  ["line1i_combat_pay",             "topmostSubform[0].Page1[0].f1_55[0]"],
  // f1_56 = line 1z (total wages — not mapped, computed by IRS PDF)
  ["line2a_tax_exempt",             "topmostSubform[0].Page1[0].f1_57[0]"],
  ["line2b_taxable_interest",       "topmostSubform[0].Page1[0].f1_58[0]"],
  ["line3a_qualified_dividends",    "topmostSubform[0].Page1[0].f1_59[0]"],
  ["line3b_ordinary_dividends",     "topmostSubform[0].Page1[0].f1_60[0]"],
  ["line4a_ira_gross",              "topmostSubform[0].Page1[0].f1_61[0]"],
  ["line4b_ira_taxable",            "topmostSubform[0].Page1[0].f1_62[0]"],
  ["line5a_pension_gross",          "topmostSubform[0].Page1[0].f1_63[0]"],
  ["line5b_pension_taxable",        "topmostSubform[0].Page1[0].f1_64[0]"],
  ["line6a_ss_gross",               "topmostSubform[0].Page1[0].f1_65[0]"],
  ["line6b_ss_taxable",             "topmostSubform[0].Page1[0].f1_66[0]"],
  // Line 7 capital gain/loss: only one of the two keys will be set per return
  ["line7_capital_gain",            "topmostSubform[0].Page1[0].f1_67[0]"],
  ["line7a_cap_gain_distrib",       "topmostSubform[0].Page1[0].f1_67[0]"],
  // f1_68 = line 8 (other income from Sch 1 — not mapped)
  // f1_69 = line 9 (total income — not mapped)
  // f1_70 = line 10 (Sch 1 Part II adjustments — not mapped)
  // f1_71 = line 11 (AGI — not mapped)
  // f1_72 = line 12a (standard deduction — not mapped directly)
  ["line12e_itemized_deductions",   "topmostSubform[0].Page1[0].f1_72[0]"],
  // f1_73 = line 12b (charitable deduction for non-itemizers — not mapped)
  // f1_74 = line 13 (QBI deduction)
  ["line13_qbi_deduction",          "topmostSubform[0].Page1[0].f1_74[0]"],
  // f1_75 = line 15 (taxable income — not mapped)

  // ── Page 2: Tax ─────────────────────────────────────────────────────────────
  // f2_02 = line 16 (tax — not mapped)
  // f2_03 = line 17 (AMT — not mapped)
  // f2_04 = line 18 (Schedule 2, excess premium — not mapped)
  // f2_05 = line 19 (total — not mapped)
  // f2_06 = line 20 (child tax credit / Sch 8812 — not mapped)
  // f2_07 = line 21 (other credits — not mapped)
  // f2_08 = line 23 (total nonrefundable credits)
  ["line20_nonrefundable_credits",  "topmostSubform[0].Page2[0].f2_08[0]"],
  // f2_09 = line 24 (tax after credits — not mapped)
  // f2_10 = line 25 (Schedule 2 other taxes sum — not mapped)
  ["line17_additional_taxes",       "topmostSubform[0].Page2[0].f2_10[0]"],
  // f2_11–f2_14: sub-lines of additional taxes — not mapped

  // ── Page 2: Payments ────────────────────────────────────────────────────────
  ["line25a_w2_withheld",           "topmostSubform[0].Page2[0].f2_15[0]"],
  ["line25b_withheld_1099",         "topmostSubform[0].Page2[0].f2_16[0]"],
  ["line25c_additional_medicare_withheld", "topmostSubform[0].Page2[0].f2_17[0]"],
  // f2_18 = total withholding — not mapped (sum of 25a-c)
  // f2_19 = line 26 (estimated tax payments — not mapped)
  // f2_20 = line 27 (EITC — not mapped)
  // f2_21 = line 27a (net premium tax credit — not mapped)
  // f2_22 = SSN ReadOrder group — skip
  ["line28_actc",                   "topmostSubform[0].Page2[0].f2_23[0]"],
  ["line29_refundable_aoc",         "topmostSubform[0].Page2[0].f2_24[0]"],
  ["line30_refundable_adoption",    "topmostSubform[0].Page2[0].f2_25[0]"],
  ["line31_additional_payments",    "topmostSubform[0].Page2[0].f2_26[0]"],
  ["line33_total_payments",         "topmostSubform[0].Page2[0].f2_27[0]"],
];

export const irs1040Pdf: PdfFormDescriptor = {
  pendingKey: "f1040",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  PDF_FIELD_MAP,
};
