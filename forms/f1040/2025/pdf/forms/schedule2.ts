import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 2 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040s2.pdf
//
// Page 1 (f1_01–f1_NN):
//   Personal info fields at top (skip)
//   Part I: Alternative Minimum Tax and Excess Premium Tax Credit Repayment
//     f1_01 = Line 1 AMT
//     f1_02 = Line 2 excess premium repayment (Form 8962)
//   Part II: Other Taxes
//     f1_04 = Line 4 SE tax
//     f1_05 = Line 5 unreported SS/Medicare from tips (Form 4137)
//     f1_06 = Line 6 wages not subject to withholding (Form 8919)
//     f1_08 = Line 8 Form 5329 additional taxes on IRAs
//     f1_10 = Line 11 additional Medicare tax (Form 8959)
//     f1_11 = Line 12 net investment income tax (Form 8960)
//     f1_17 = Line 17 other taxes (catch-all)

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Part I: AMT ──────────────────────────────────────────────────────────────
  ["line1_amt",                  "topmostSubform[0].Page1[0].f1_01[0]"],

  // ── Part II: Other Taxes ─────────────────────────────────────────────────────
  ["line4_se_tax",               "topmostSubform[0].Page1[0].f1_04[0]"],
  ["line5_unreported_tip_tax",   "topmostSubform[0].Page1[0].f1_05[0]"],
  ["line6_uncollected_8919",     "topmostSubform[0].Page1[0].f1_06[0]"],
  ["line8_form5329_tax",         "topmostSubform[0].Page1[0].f1_08[0]"],
  ["line11_additional_medicare", "topmostSubform[0].Page1[0].f1_10[0]"],
  ["line12_niit",                "topmostSubform[0].Page1[0].f1_11[0]"],
];

export const schedule2Pdf: PdfFormDescriptor = {
  pendingKey: "schedule2",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  PDF_FIELD_MAP,
};
