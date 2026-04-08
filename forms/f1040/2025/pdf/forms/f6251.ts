import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 6251 (2025) AcroForm field names.
// Part I  — AMT adjustments and preferences (lines 1–3).
// Part II — AMT computation (lines 4–12).
// Field order follows the XSD sequence used in the MEF FIELD_MAP.
// Line 1:  regular_tax_income (AGI or AGI less deductions).
// Line 2a: line2a_taxes_paid (state/local taxes from Sch A).
// Line 2f: nol_adjustment (alternative tax NOL deduction).
// Line 2g: private_activity_bond_interest (tax-exempt PAB interest).
// Line 2h: qsbs_adjustment (Section 1202 exclusion).
// Line 2i: iso_adjustment (incentive stock options).
// Line 2l: depreciation_adjustment.
// Line 3:  other_adjustments.
// Line 8:  amtftc (AMT foreign tax credit).
// Line 10: regular_tax.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["regular_tax_income",              "topmostSubform[0].Page1[0].f1_01[0]"],
  ["line2a_taxes_paid",               "topmostSubform[0].Page1[0].f1_02[0]"],
  ["nol_adjustment",                  "topmostSubform[0].Page1[0].f1_07[0]"],
  ["private_activity_bond_interest",  "topmostSubform[0].Page1[0].f1_08[0]"],
  ["qsbs_adjustment",                 "topmostSubform[0].Page1[0].f1_09[0]"],
  ["iso_adjustment",                  "topmostSubform[0].Page1[0].f1_10[0]"],
  ["depreciation_adjustment",         "topmostSubform[0].Page1[0].f1_13[0]"],
  ["other_adjustments",               "topmostSubform[0].Page1[0].f1_18[0]"],
  ["amtftc",                          "topmostSubform[0].Page1[0].f1_25[0]"],
  ["regular_tax",                     "topmostSubform[0].Page1[0].f1_27[0]"],
];

export const form6251Pdf: PdfFormDescriptor = {
  pendingKey: "form6251",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6251.pdf",
  PDF_FIELD_MAP,
};
