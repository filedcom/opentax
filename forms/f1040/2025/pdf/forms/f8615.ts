import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8615 (2025) AcroForm field names.
// Tax for Certain Children Who Have Unearned Income ("Kiddie Tax").
// Name/SSN/parent info fields skipped.
// net_unearned_income    → line 1 (net unearned income)
// parent_taxable_income  → line 6 (parent's taxable income)
// parent_tax             → line 7 (parent's tax)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "net_unearned_income", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "parent_taxable_income", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "parent_tax", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
];

export const form8615Pdf: PdfFormDescriptor = {
  pendingKey: "form8615",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8615.pdf",
  fields,
};
