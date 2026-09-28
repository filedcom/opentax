import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8829 (2025) AcroForm field names.
// Expenses for Business Use of Your Home.
// Name/SSN header fields skipped. Field positions checked against the 2025
// AcroForm and the printed line numbers; this is not a complete form fill.
// Part I  — Part of your home used for business.
// Part II — Figure your allowable deduction.
// Part III — Depreciation of your home.
// Part IV — Carryover of unallowed expenses.
// business_area                   → line 1  (area used for business)
// total_area                      → line 2  (area of home)
// mortgage_interest               → line 10, indirect column
// insurance                       → line 18, indirect column
// rent                            → line 19, indirect column
// repairs_maintenance             → line 20, indirect column
// utilities                       → line 21, indirect column
// other_expenses                  → line 22, indirect column
// gross_income_limit              → line 8  (gross income from business)
// prior_year_operating_carryover  → line 25 (prior-year operating expense carryover)
// home_fmv_or_basis               → line 37 (smaller of FMV or adjusted basis)
// prior_year_depreciation_carryover → line 31 (prior-year depreciation carryover)
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "business_area",
    pdfField: "topmostSubform[0].Page1[0].f1_03[0]",
  },
  {
    kind: "text",
    domainKey: "total_area",
    pdfField: "topmostSubform[0].Page1[0].f1_04[0]",
  },
  {
    kind: "text",
    domainKey: "gross_income_limit",
    pdfField: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "mortgage_interest",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines9-12[0].Line10[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "insurance",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line18[0].f1_27[0]",
  },
  {
    kind: "text",
    domainKey: "rent",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line19[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "repairs_maintenance",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line20[0].f1_31[0]",
  },
  {
    kind: "text",
    domainKey: "utilities",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line21[0].f1_33[0]",
  },
  {
    kind: "text",
    domainKey: "other_expenses",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line22[0].f1_35[0]",
  },
  {
    kind: "text",
    domainKey: "home_fmv_or_basis",
    pdfField: "topmostSubform[0].Page1[0].f1_51[0]",
  },
  {
    kind: "text",
    domainKey: "prior_year_operating_carryover",
    pdfField: "topmostSubform[0].Page1[0].f1_39[0]",
  },
  {
    kind: "text",
    domainKey: "prior_year_depreciation_carryover",
    pdfField: "topmostSubform[0].Page1[0].f1_45[0]",
  },
];

export const form8829Pdf: PdfFormDescriptor = {
  pendingKey: "form_8829",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8829--2025.pdf",
  fields,
};
