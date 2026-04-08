import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1116 (2025) AcroForm field names.
// Part I  — foreign income: line 1a column A (approx f1_07 range).
// Part I  — total income: line 6 total (approx f1_47 range).
// Part II — taxes paid/accrued: approx f1_50 range.
// Part III — US tax before credits: page 2 line 9 (approx f2_02 range).
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "foreign_income", pdfField: "topmostSubform[0].Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Line1a_Text[0].f1_07[0]" },
  { kind: "text", domainKey: "total_income", pdfField: "topmostSubform[0].Page1[0].Table_Part1_Lines2-6[0].Line6[0].f1_47[0]" },
  { kind: "text", domainKey: "foreign_tax_paid", pdfField: "topmostSubform[0].Page1[0].f1_50[0]" },
  { kind: "text", domainKey: "us_tax_before_credits", pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
];

export const form1116Pdf: PdfFormDescriptor = {
  pendingKey: "form_1116",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  fields,
};
