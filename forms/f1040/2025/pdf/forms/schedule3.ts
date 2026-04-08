import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 3 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040s3.pdf
//
// Page 1 (f1_01–f1_NN):
//   Personal info / SSN at top (skip)
//   Part I: Nonrefundable Credits
//     f1_01 = Line 1 foreign tax credit (Form 1116 / direct 1099)
//     f1_02 = Line 2 child and dependent care credit (Form 2441)
//     f1_03 = Line 3 education credits (Form 8863)
//     f1_04 = Line 4 retirement savings credit (Form 8880)
//     f1_06 = Line 6b child tax credit / credit for other dependents
//     f1_07 = Line 6c adoption credit (Form 8839)
//
// Page 2 (f2_01–f2_NN):
//   Part II: Other Payments and Refundable Credits
//     f2_01 = Line 10 amount paid with extension request
//     f2_02 = Line 11 excess Social Security withheld

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Part I: Nonrefundable Credits ────────────────────────────────────────────
  ["line1_foreign_tax_credit",      "topmostSubform[0].Page1[0].f1_01[0]"],
  ["line1_foreign_tax_1099",        "topmostSubform[0].Page1[0].f1_01[0]"],
  ["line2_childcare_credit",        "topmostSubform[0].Page1[0].f1_02[0]"],
  ["line3_education_credit",        "topmostSubform[0].Page1[0].f1_03[0]"],
  ["line4_retirement_savings_credit", "topmostSubform[0].Page1[0].f1_04[0]"],
  ["line6b_child_tax_credit",       "topmostSubform[0].Page1[0].f1_06[0]"],
  ["line6c_adoption_credit",        "topmostSubform[0].Page1[0].f1_07[0]"],

  // ── Part II: Other Payments ──────────────────────────────────────────────────
  ["line10_amount_paid_extension",  "topmostSubform[0].Page2[0].f2_01[0]"],
  ["line11_excess_ss",              "topmostSubform[0].Page2[0].f2_02[0]"],
];

export const schedule3Pdf: PdfFormDescriptor = {
  pendingKey: "schedule3",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s3.pdf",
  PDF_FIELD_MAP,
};
