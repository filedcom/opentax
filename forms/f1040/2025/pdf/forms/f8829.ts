import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8829 (2025) AcroForm field names.
// Expenses for Business Use of Your Home.
// Name/SSN header fields skipped. Field positions checked against the 2025
// AcroForm and the printed line numbers; this is not a complete form fill.
// Part I  — Part of your home used for business.
// Part II — Figure your allowable deduction.
// Part III — Depreciation of your home.
// Part IV — Carryover of unallowed expenses.
// Bounded rented-home route: line 1-3, 7-8, 18b-28, 32-36, and 43-44.
// Header, remaining computed lines, and a filled render need the PDF gate.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "line1",
    pdfField: "topmostSubform[0].Page1[0].f1_03[0]",
  },
  {
    kind: "text",
    domainKey: "line2",
    pdfField: "topmostSubform[0].Page1[0].f1_04[0]",
  },
  {
    kind: "text",
    domainKey: "line8",
    pdfField: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line18b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line18[0].f1_27[0]",
  },
  {
    kind: "text",
    domainKey: "line19b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line19[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "line20b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line20[0].f1_31[0]",
  },
  {
    kind: "text",
    domainKey: "line21b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line21[0].f1_33[0]",
  },
  {
    kind: "text",
    domainKey: "line22b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line22[0].f1_35[0]",
  },
  {
    kind: "text",
    domainKey: "line25",
    pdfField: "topmostSubform[0].Page1[0].f1_39[0]",
  },
];

export const form8829Pdf: PdfFormDescriptor = {
  pendingKey: "form_8829",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8829--2025.pdf",
  includeWhen: (source) => typeof source.line36 === "number",
  fields,
};
