import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8606 (2025) AcroForm field names.
// Part I  — Nondeductible contributions to traditional IRAs.
// Part II — Conversions and distributions from traditional/SEP/SIMPLE IRAs.
// Part III — Distributions from Roth IRAs.
// Name/SSN header fields skipped.
// nondeductible_contributions → line 1  (nondeductible contributions this year)
// prior_basis                 → line 2  (total basis in traditional IRAs)
// year_end_ira_value          → line 6  (value of all traditional IRAs at year end)
// traditional_distributions   → line 7  (distributions from traditional/SEP/SIMPLE IRAs)
// roth_conversion             → line 8  (conversions to Roth IRAs)
// roth_distribution           → line 19 (distributions from Roth IRAs)
// roth_basis_contributions    → line 22 (basis in Roth IRA contributions)
// roth_basis_conversions      → line 24 (basis in Roth conversions)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["nondeductible_contributions", "topmostSubform[0].Page1[0].f1_03[0]"],
  ["prior_basis",                 "topmostSubform[0].Page1[0].f1_04[0]"],
  ["year_end_ira_value",          "topmostSubform[0].Page1[0].f1_09[0]"],
  ["traditional_distributions",   "topmostSubform[0].Page1[0].f1_10[0]"],
  ["roth_conversion",             "topmostSubform[0].Page1[0].f1_11[0]"],
  ["roth_distribution",           "topmostSubform[0].Page1[0].f1_22[0]"],
  ["roth_basis_contributions",    "topmostSubform[0].Page1[0].f1_25[0]"],
  ["roth_basis_conversions",      "topmostSubform[0].Page1[0].f1_27[0]"],
];

export const form8606Pdf: PdfFormDescriptor = {
  pendingKey: "form8606",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8606.pdf",
  PDF_FIELD_MAP,
};
