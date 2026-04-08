import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8839 (2025) AcroForm field names.
// Qualified Adoption Expenses.
// Name/SSN/child info fields skipped.
// adoption_benefits    → line 22 (employer-provided adoption benefits)
// magi                 → line 23 (modified adjusted gross income)
// income_tax_liability → line 27 (income tax liability)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["adoption_benefits",    "topmostSubform[0].Page2[0].f2_03[0]"],
  ["magi",                 "topmostSubform[0].Page2[0].f2_04[0]"],
  ["income_tax_liability", "topmostSubform[0].Page2[0].f2_08[0]"],
];

export const form8839Pdf: PdfFormDescriptor = {
  pendingKey: "form8839",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8839.pdf",
  PDF_FIELD_MAP,
};
