import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "earned_income", pdfField: "topmostSubform[0].Page1[0].Line6_Child1_ReadOrder[0].f1_24[0]" },
  { kind: "text", domainKey: "investment_income", pdfField: "topmostSubform[0].Page1[0].Line6_Child2_ReadOrder[0].f1_25[0]" },
  { kind: "text", domainKey: "qualifying_children", pdfField: "topmostSubform[0].Page1[0].f1_26[0]" },
];

export const eitcPdf: PdfFormDescriptor = {
  pendingKey: "eitc",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sei.pdf",
  fields,
};
