import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule H (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sh.pdf
//
// Part I Social Security, Medicare, and FUTA Taxes:
//   f1_01 = Line 1 total cash wages paid
//   f1_03 = Line 3 SS wages
//   f1_05 = Line 5 Medicare wages
//   f1_07 = Line 7 federal income tax withheld
//   f1_08 = Line 8 employee SS tax withheld
//   f1_09 = Line 9 employee Medicare tax withheld
//   f1_10 = Line 10 FUTA wages
//   f1_14 = Line 14 FUTA tax (after credits)

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "total_cash_wages", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
  { kind: "text", domainKey: "ss_wages", pdfField: "topmostSubform[0].Page1[0].CombField[0].f1_3[0]" },
  { kind: "text", domainKey: "medicare_wages", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "federal_income_tax_withheld", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "employee_ss_withheld", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
  { kind: "text", domainKey: "employee_medicare_withheld", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "futa_wages", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "futa_tax", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
];

export const scheduleHPdf: PdfFormDescriptor = {
  pendingKey: "schedule_h",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf",
  fields,
};
