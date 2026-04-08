import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8889 (2025) AcroForm field names.
// Health Savings Accounts (HSAs).
// Name/SSN/coverage type fields skipped.
// Part I  — HSA Contributions and Deduction.
// Part II — HSA Distributions.
// taxpayer_hsa_contributions → line 2  (HSA contributions you made)
// employer_hsa_contributions → line 9  (employer contributions)
// hsa_distributions          → line 14a (total HSA distributions)
// qualified_medical_expenses → line 15 (qualified medical expenses)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["taxpayer_hsa_contributions", "topmostSubform[0].Page1[0].f1_05[0]"],
  ["employer_hsa_contributions", "topmostSubform[0].Page1[0].f1_13[0]"],
  ["hsa_distributions",          "topmostSubform[0].Page1[0].f1_17[0]"],
  ["qualified_medical_expenses", "topmostSubform[0].Page1[0].f1_18[0]"],
];

export const form8889Pdf: PdfFormDescriptor = {
  pendingKey: "form8889",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8889.pdf",
  PDF_FIELD_MAP,
};
