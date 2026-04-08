import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8990 (2025) AcroForm field names.
// Limitation on Business Interest Expense Under Section 163(j).
// Name/SSN/EIN header fields skipped.
// Part I  — Business Interest Expense.
// Part II — Adjusted Taxable Income.
// business_interest_expense    → line 1  (current-year business interest expense)
// prior_disallowed_carryforward → line 2 (prior-year disallowed BIE carryforward)
// floor_plan_interest          → line 3  (floor plan financing interest)
// tentative_taxable_income     → line 6  (tentative taxable income)
// depreciation_amortization    → line 7  (depreciation/amortization)
// business_interest_income     → line 10 (business interest income)
// avg_gross_receipts           → line 11 (average annual gross receipts)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["business_interest_expense",    "topmostSubform[0].Page1[0].f1_04[0]"],
  ["prior_disallowed_carryforward","topmostSubform[0].Page1[0].f1_05[0]"],
  ["floor_plan_interest",          "topmostSubform[0].Page1[0].f1_06[0]"],
  ["tentative_taxable_income",     "topmostSubform[0].Page1[0].f1_09[0]"],
  ["depreciation_amortization",    "topmostSubform[0].Page1[0].f1_10[0]"],
  ["business_interest_income",     "topmostSubform[0].Page1[0].f1_13[0]"],
  ["avg_gross_receipts",           "topmostSubform[0].Page1[0].f1_14[0]"],
];

export const form8990Pdf: PdfFormDescriptor = {
  pendingKey: "form8990",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8990.pdf",
  PDF_FIELD_MAP,
};
