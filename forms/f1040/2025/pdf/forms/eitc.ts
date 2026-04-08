import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule EIC (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sei.pdf
//
// The Schedule EIC PDF primarily contains qualifying child information tables
// (names, SSNs, birthdates, relationship) which are not computed engine fields.
// The key engine-computed scalars map to the summary fields at the end of the form:
//   f1_24 = earned income amount
//   f1_25 = investment income amount
//   f1_26 = number of qualifying children
// AGI is an internal computation and does not appear as a standalone PDF field.

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["earned_income",       "topmostSubform[0].Page1[0].f1_24[0]"],
  ["investment_income",   "topmostSubform[0].Page1[0].f1_25[0]"],
  ["qualifying_children", "topmostSubform[0].Page1[0].f1_26[0]"],
];

export const eitcPdf: PdfFormDescriptor = {
  pendingKey: "eitc",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  PDF_FIELD_MAP,
};
