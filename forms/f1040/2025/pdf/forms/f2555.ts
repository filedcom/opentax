import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 2555 (2025) AcroForm field names (134 fields across 3 pages).
// Part II  — days in foreign country: line 16c (approx f1_14 range).
// Part IV  — foreign wages: line 19 (approx page 2 fields).
// Part VIII — employer housing exclusion: line 29 (approx page 3).
// Part VIII — foreign housing expenses: line 30 (approx page 3).
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["days_in_foreign_country",       "topmostSubform[0].Page1[0].f1_14[0]"],
  ["foreign_wages",                 "topmostSubform[0].Page2[0].f2_07[0]"],
  ["foreign_self_employment_income","topmostSubform[0].Page2[0].f2_08[0]"],
  ["employer_housing_exclusion",    "topmostSubform[0].Page3[0].f3_05[0]"],
  ["foreign_housing_expenses",      "topmostSubform[0].Page3[0].f3_06[0]"],
];

export const form2555Pdf: PdfFormDescriptor = {
  pendingKey: "form2555",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2555.pdf",
  PDF_FIELD_MAP,
};
