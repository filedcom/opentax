import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1116 (2025) AcroForm field names.
// Part I  — foreign income: line 1a column A (approx f1_07 range).
// Part I  — total income: line 6 total (approx f1_47 range).
// Part II — taxes paid/accrued: approx f1_50 range.
// Part III — US tax before credits: page 2 line 9 (approx f2_02 range).
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["foreign_income",         "topmostSubform[0].Page1[0].f1_07[0]"],
  ["total_income",           "topmostSubform[0].Page1[0].f1_47[0]"],
  ["foreign_tax_paid",       "topmostSubform[0].Page1[0].f1_50[0]"],
  ["us_tax_before_credits",  "topmostSubform[0].Page2[0].f2_02[0]"],
];

export const form1116Pdf: PdfFormDescriptor = {
  pendingKey: "form_1116",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  PDF_FIELD_MAP,
};
