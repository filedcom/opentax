import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["total_area",                       "topmostSubform[0].Page1[0].f1_03[0]"],
  ["business_area",                    "topmostSubform[0].Page1[0].f1_04[0]"],
  ["gross_income_limit",               "topmostSubform[0].Page1[0].f1_10[0]"],
  ["mortgage_interest",                "topmostSubform[0].Page1[0].f1_13[0]"],
  ["insurance",                        "topmostSubform[0].Page1[0].f1_22[0]"],
  ["rent",                             "topmostSubform[0].Page1[0].f1_23[0]"],
  ["repairs_maintenance",              "topmostSubform[0].Page1[0].f1_24[0]"],
  ["utilities",                        "topmostSubform[0].Page1[0].f1_25[0]"],
  ["other_expenses",                   "topmostSubform[0].Page1[0].f1_26[0]"],
  ["home_fmv_or_basis",                "topmostSubform[0].Page1[0].f1_39[0]"],
  ["prior_year_operating_carryover",   "topmostSubform[0].Page1[0].f1_46[0]"],
  ["prior_year_depreciation_carryover","topmostSubform[0].Page1[0].f1_47[0]"],
];

export const form8829Pdf: PdfFormDescriptor = {
  pendingKey: "form_8829",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8829.pdf",
  PDF_FIELD_MAP,
};
