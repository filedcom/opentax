import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8889 (2025) AcroForm field names.
// Health Savings Accounts (HSAs).
// Name/SSN/coverage type fields skipped.
// Part I  — HSA Contributions and Deduction.
// Part II — HSA Distributions.
// taxpayer_hsa_contributions → line 2  (HSA contributions you made)
// employer_hsa_contributions → line 9  (employer contributions)
// hsa_distributions          → line 14a (total HSA distributions)
// qualified_medical_expenses → line 15 (qualified medical expenses)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "taxpayer_hsa_contributions", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "employer_hsa_contributions", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "hsa_distributions", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "qualified_medical_expenses", pdfField: "topmostSubform[0].Page1[0].f1_18[0]" },
];

export const form8889Pdf: PdfFormDescriptor = {
  pendingKey: "form8889",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8889.pdf",
  fields,
};
