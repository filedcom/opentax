import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8829 (2025) AcroForm field names.
// Expenses for Business Use of Your Home.
// Name/SSN header fields skipped.
// Part I  — Part of your home used for business.
// Part II — Figure your allowable deduction.
// Part III — Depreciation of your home.
// Part IV — Carryover of unallowed expenses.
// total_area                      → line 1  (area of home)
// business_area                   → line 2  (area used for business)
// mortgage_interest               → line 10 (deductible mortgage interest)
// insurance                       → line 19 (insurance)
// rent                            → line 20 (rent)
// repairs_maintenance             → line 21 (repairs and maintenance)
// utilities                       → line 22 (utilities)
// other_expenses                  → line 23 (other expenses)
// gross_income_limit              → line 8  (gross income from business)
// prior_year_operating_carryover  → line 43 (prior-year operating expense carryover)
// home_fmv_or_basis               → line 36 (smaller of FMV or adjusted basis)
// prior_year_depreciation_carryover → line 44 (prior-year depreciation carryover)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "total_area", pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
  { kind: "text", domainKey: "business_area", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "gross_income_limit", pdfField: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].f1_10[0]" },
  { kind: "text", domainKey: "mortgage_interest", pdfField: "topmostSubform[0].Page1[0].Table_Lines9-12[0].Line10[0].f1_13[0]" },
  { kind: "text", domainKey: "insurance", pdfField: "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line16[0].f1_22[0]" },
  { kind: "text", domainKey: "rent", pdfField: "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line16[0].f1_23[0]" },
  { kind: "text", domainKey: "repairs_maintenance", pdfField: "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line17[0].f1_24[0]" },
  { kind: "text", domainKey: "utilities", pdfField: "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line17[0].f1_25[0]" },
  { kind: "text", domainKey: "other_expenses", pdfField: "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line18[0].f1_26[0]" },
  { kind: "text", domainKey: "home_fmv_or_basis", pdfField: "topmostSubform[0].Page1[0].f1_39[0]" },
  { kind: "text", domainKey: "prior_year_operating_carryover", pdfField: "topmostSubform[0].Page1[0].f1_46[0]" },
  { kind: "text", domainKey: "prior_year_depreciation_carryover", pdfField: "topmostSubform[0].Page1[0].f1_47[0]" },
];

export const form8829Pdf: PdfFormDescriptor = {
  pendingKey: "form_8829",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8829.pdf",
  fields,
};
