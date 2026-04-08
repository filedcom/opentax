import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8959 (2025) AcroForm field names.
// Additional Medicare Tax.
// Name/SSN/filing status fields skipped.
// Part I  — Additional Medicare Tax on Medicare Wages.
// Part II — Additional Medicare Tax on Self-Employment Income.
// Part III — Additional Medicare Tax on Railroad Retirement Tax Act (RRTA) Wages.
// Part V  — Total Additional Medicare Tax Withheld.
// medicare_wages        → line 1  (total Medicare wages)
// unreported_tips       → line 2  (unreported tips)
// wages_8919            → line 3  (wages from Form 8919)
// se_income             → line 6  (self-employment income)
// rrta_wages            → line 10 (RRTA compensation)
// medicare_withheld     → line 19 (Additional Medicare Tax withheld from W-2)
// rrta_medicare_withheld → line 20 (Additional Medicare Tax withheld from RRTA)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "medicare_wages", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "unreported_tips", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "wages_8919", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "se_income", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "rrta_wages", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "medicare_withheld", pdfField: "topmostSubform[0].Page1[0].f1_22[0]" },
  { kind: "text", domainKey: "rrta_medicare_withheld", pdfField: "topmostSubform[0].Page1[0].f1_23[0]" },
];

export const form8959Pdf: PdfFormDescriptor = {
  pendingKey: "form8959",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8959.pdf",
  fields,
};
