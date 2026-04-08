import type { PdfFormDescriptor } from "../form-descriptor.ts";

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

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["total_cash_wages",             "topmostSubform[0].Page1[0].f1_01[0]"],
  ["ss_wages",                     "topmostSubform[0].Page1[0].f1_03[0]"],
  ["medicare_wages",               "topmostSubform[0].Page1[0].f1_05[0]"],
  ["federal_income_tax_withheld",  "topmostSubform[0].Page1[0].f1_07[0]"],
  ["employee_ss_withheld",         "topmostSubform[0].Page1[0].f1_08[0]"],
  ["employee_medicare_withheld",   "topmostSubform[0].Page1[0].f1_09[0]"],
  ["futa_wages",                   "topmostSubform[0].Page1[0].f1_10[0]"],
  ["futa_tax",                     "topmostSubform[0].Page1[0].f1_14[0]"],
];

export const scheduleHPdf: PdfFormDescriptor = {
  pendingKey: "schedule_h",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sh.pdf",
  PDF_FIELD_MAP,
};
