import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "business_interest_expense", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "prior_disallowed_carryforward", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "floor_plan_interest", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "tentative_taxable_income", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "depreciation_amortization", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "business_interest_income", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "avg_gross_receipts", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
];

export const form8990Pdf: PdfFormDescriptor = {
  pendingKey: "form8990",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8990.pdf",
  fields,
};
