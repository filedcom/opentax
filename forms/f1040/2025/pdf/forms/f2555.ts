import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 2555 (2025) AcroForm field names (134 fields across 3 pages).
// Part II  — days in foreign country: line 16c (approx f1_14 range).
// Part IV  — foreign wages: line 19 (approx page 2 fields).
// Part VIII — employer housing exclusion: line 29 (approx page 3).
// Part VIII — foreign housing expenses: line 30 (approx page 3).
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "days_in_foreign_country", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "foreign_wages", pdfField: "topmostSubform[0].Page2[0].Table_Line18[0].BodyRow1[0].f2_7[0]" },
  { kind: "text", domainKey: "foreign_self_employment_income", pdfField: "topmostSubform[0].Page2[0].Table_Line18[0].BodyRow1[0].f2_8[0]" },
  { kind: "text", domainKey: "employer_housing_exclusion", pdfField: "topmostSubform[0].Page3[0].f3_5[0]" },
  { kind: "text", domainKey: "foreign_housing_expenses", pdfField: "topmostSubform[0].Page3[0].f3_6[0]" },
];

export const form2555Pdf: PdfFormDescriptor = {
  pendingKey: "form2555",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2555.pdf",
  fields,
};
