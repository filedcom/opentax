import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8615 (2025) AcroForm field names.
// Tax for Certain Children Who Have Unearned Income ("Kiddie Tax").
// Name/SSN/parent info fields skipped.
// net_unearned_income    → line 1 (net unearned income)
// parent_taxable_income  → line 6 (parent's taxable income)
// parent_tax             → line 7 (parent's tax)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["net_unearned_income",   "topmostSubform[0].Page1[0].f1_05[0]"],
  ["parent_taxable_income", "topmostSubform[0].Page1[0].f1_10[0]"],
  ["parent_tax",            "topmostSubform[0].Page1[0].f1_11[0]"],
];

export const form8615Pdf: PdfFormDescriptor = {
  pendingKey: "form8615",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8615.pdf",
  PDF_FIELD_MAP,
};
