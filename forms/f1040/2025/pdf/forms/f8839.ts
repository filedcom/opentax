import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8839 (2025) AcroForm field names.
// Qualified Adoption Expenses.
// Name/SSN/child info fields skipped.
// adoption_benefits    → line 22 (employer-provided adoption benefits)
// magi                 → line 23 (modified adjusted gross income)
// income_tax_liability → line 27 (income tax liability)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "adoption_benefits", pdfField: "topmostSubform[0].Page2[0].Child3[0].f2_3[0]" },
  { kind: "text", domainKey: "magi", pdfField: "topmostSubform[0].Page2[0].f2_4[0]" },
  { kind: "text", domainKey: "income_tax_liability", pdfField: "topmostSubform[0].Page2[0].f2_8[0]" },
];

export const form8839Pdf: PdfFormDescriptor = {
  pendingKey: "form8839",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8839.pdf",
  fields,
};
