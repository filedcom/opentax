import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4952 (2025) AcroForm field names.
// Part I  — investment interest expense: line 1.
// Part II — net investment income: line 4g total.
// Prior year disallowed carryforward: line 2 (above Part I).
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["prior_year_carryforward",      "topmostSubform[0].Page1[0].f1_01[0]"],
  ["investment_interest_expense",  "topmostSubform[0].Page1[0].f1_02[0]"],
  ["net_investment_income",        "topmostSubform[0].Page1[0].f1_07[0]"],
];

export const form4952Pdf: PdfFormDescriptor = {
  pendingKey: "form4952",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4952.pdf",
  PDF_FIELD_MAP,
};
