import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Page 1: Income ──────────────────────────────────────────────────────────
  { kind: "text", domainKey: "line1a_wages", pdfField: "topmostSubform[0].Page1[0].f1_47[0]" },
  // f1_48 = line 1b (household employee wages — not mapped)
  { kind: "text", domainKey: "line1c_unreported_tips", pdfField: "topmostSubform[0].Page1[0].f1_49[0]" },
  // f1_50 = line 1d (medicaid waiver — not mapped)
  { kind: "text", domainKey: "line1e_taxable_dep_care", pdfField: "topmostSubform[0].Page1[0].f1_51[0]" },
  { kind: "text", domainKey: "line1f_taxable_adoption_benefits", pdfField: "topmostSubform[0].Page1[0].f1_52[0]" },
  { kind: "text", domainKey: "line1g_wages_8919", pdfField: "topmostSubform[0].Page1[0].f1_53[0]" },
  // f1_54 = line 1h (other income — not mapped)
  { kind: "text", domainKey: "line1i_combat_pay", pdfField: "topmostSubform[0].Page1[0].f1_55[0]" },
  // f1_56 = line 1z (total wages — not mapped, computed by IRS PDF)
  { kind: "text", domainKey: "line2a_tax_exempt", pdfField: "topmostSubform[0].Page1[0].f1_57[0]" },
  { kind: "text", domainKey: "line2b_taxable_interest", pdfField: "topmostSubform[0].Page1[0].f1_58[0]" },
  { kind: "text", domainKey: "line3a_qualified_dividends", pdfField: "topmostSubform[0].Page1[0].f1_59[0]" },
  { kind: "text", domainKey: "line3b_ordinary_dividends", pdfField: "topmostSubform[0].Page1[0].f1_60[0]" },
  { kind: "text", domainKey: "line4a_ira_gross", pdfField: "topmostSubform[0].Page1[0].f1_61[0]" },
  { kind: "text", domainKey: "line4b_ira_taxable", pdfField: "topmostSubform[0].Page1[0].f1_62[0]" },
  { kind: "text", domainKey: "line5a_pension_gross", pdfField: "topmostSubform[0].Page1[0].f1_63[0]" },
  { kind: "text", domainKey: "line5b_pension_taxable", pdfField: "topmostSubform[0].Page1[0].f1_64[0]" },
  { kind: "text", domainKey: "line6a_ss_gross", pdfField: "topmostSubform[0].Page1[0].f1_65[0]" },
  { kind: "text", domainKey: "line6b_ss_taxable", pdfField: "topmostSubform[0].Page1[0].f1_66[0]" },
  // Line 7 capital gain/loss: only one of the two keys will be set per return
  { kind: "text", domainKey: "line7_capital_gain", pdfField: "topmostSubform[0].Page1[0].f1_67[0]" },
  { kind: "text", domainKey: "line7a_cap_gain_distrib", pdfField: "topmostSubform[0].Page1[0].f1_67[0]" },
  // f1_68 = line 8 (other income from Sch 1 — not mapped)
  // f1_69 = line 9 (total income — not mapped)
  // f1_70 = line 10 (Sch 1 Part II adjustments — not mapped)
  // f1_71 = line 11 (AGI — not mapped)
  // f1_72 = line 12a (standard deduction — not mapped directly)
  { kind: "text", domainKey: "line12e_itemized_deductions", pdfField: "topmostSubform[0].Page1[0].f1_72[0]" },
  // f1_73 = line 12b (charitable deduction for non-itemizers — not mapped)
  // f1_74 = line 13 (QBI deduction)
  { kind: "text", domainKey: "line13_qbi_deduction", pdfField: "topmostSubform[0].Page1[0].f1_74[0]" },
  // f1_75 = line 15 (taxable income — not mapped)

  // ── Page 2: Tax ─────────────────────────────────────────────────────────────
  // f2_02 = line 16 (tax — not mapped)
  // f2_03 = line 17 (AMT — not mapped)
  // f2_04 = line 18 (Schedule 2, excess premium — not mapped)
  // f2_05 = line 19 (total — not mapped)
  // f2_06 = line 20 (child tax credit / Sch 8812 — not mapped)
  // f2_07 = line 21 (other credits — not mapped)
  // f2_08 = line 23 (total nonrefundable credits)
  { kind: "text", domainKey: "line20_nonrefundable_credits", pdfField: "topmostSubform[0].Page2[0].f2_08[0]" },
  // f2_09 = line 24 (tax after credits — not mapped)
  // f2_10 = line 25 (Schedule 2 other taxes sum — not mapped)
  { kind: "text", domainKey: "line17_additional_taxes", pdfField: "topmostSubform[0].Page2[0].f2_10[0]" },
  // f2_11–f2_14: sub-lines of additional taxes — not mapped

  // ── Page 2: Payments ────────────────────────────────────────────────────────
  { kind: "text", domainKey: "line25a_w2_withheld", pdfField: "topmostSubform[0].Page2[0].f2_15[0]" },
  { kind: "text", domainKey: "line25b_withheld_1099", pdfField: "topmostSubform[0].Page2[0].f2_16[0]" },
  { kind: "text", domainKey: "line25c_additional_medicare_withheld", pdfField: "topmostSubform[0].Page2[0].f2_17[0]" },
  // f2_18 = total withholding — not mapped (sum of 25a-c)
  // f2_19 = line 26 (estimated tax payments — not mapped)
  // f2_20 = line 27 (EITC — not mapped)
  // f2_21 = line 27a (net premium tax credit — not mapped)
  // f2_22 = SSN ReadOrder group — skip
  { kind: "text", domainKey: "line28_actc", pdfField: "topmostSubform[0].Page2[0].f2_23[0]" },
  { kind: "text", domainKey: "line29_refundable_aoc", pdfField: "topmostSubform[0].Page2[0].f2_24[0]" },
  { kind: "text", domainKey: "line30_refundable_adoption", pdfField: "topmostSubform[0].Page2[0].f2_25[0]" },
  { kind: "text", domainKey: "line31_additional_payments", pdfField: "topmostSubform[0].Page2[0].f2_26[0]" },
  { kind: "text", domainKey: "line33_total_payments", pdfField: "topmostSubform[0].Page2[0].f2_27[0]" },
];

export const irs1040Pdf: PdfFormDescriptor = {
  pendingKey: "f1040",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  fields,
  filerFields: [
    // ── Primary taxpayer ─────────────────────────────────────────────────────
    { kind: "text", domainKey: "primary_first_name",   pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
    { kind: "text", domainKey: "primary_last_name",    pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
    { kind: "text", domainKey: "primary_ssn",          pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
    // ── Spouse ───────────────────────────────────────────────────────────────
    { kind: "text", domainKey: "spouse_first_name",    pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
    { kind: "text", domainKey: "spouse_last_name",     pdfField: "topmostSubform[0].Page1[0].f1_06[0]" },
    { kind: "text", domainKey: "spouse_ssn",           pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
    // ── Address ──────────────────────────────────────────────────────────────
    { kind: "text", domainKey: "address_street",       pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_20[0]" },
    { kind: "text", domainKey: "address_city",         pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_22[0]" },
    { kind: "text", domainKey: "address_state",        pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_23[0]" },
    { kind: "text", domainKey: "address_zip",          pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_24[0]" },
  ],
};
