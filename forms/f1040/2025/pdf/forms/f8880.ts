import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8880 (2025) AcroForm field names.
// Credit for Qualified Retirement Savings Contributions (Saver's Credit).
// Name/SSN header fields skipped.
// ira_contributions_taxpayer   → line 1a (taxpayer IRA contributions)
// ira_contributions_spouse     → line 1b (spouse IRA contributions)
// elective_deferrals           → line 2  (total elective deferrals)
// elective_deferrals_taxpayer  → line 2a (taxpayer elective deferrals)
// elective_deferrals_spouse    → line 2b (spouse elective deferrals)
// distributions_taxpayer       → line 4a (taxpayer distributions)
// distributions_spouse         → line 4b (spouse distributions)
// agi                          → line 8  (adjusted gross income)
// income_tax_liability         → line 10 (income tax liability)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["ira_contributions_taxpayer",  "topmostSubform[0].Page1[0].f1_03[0]"],
  ["ira_contributions_spouse",    "topmostSubform[0].Page1[0].f1_04[0]"],
  ["elective_deferrals_taxpayer", "topmostSubform[0].Page1[0].f1_05[0]"],
  ["elective_deferrals_spouse",   "topmostSubform[0].Page1[0].f1_06[0]"],
  ["elective_deferrals",          "topmostSubform[0].Page1[0].f1_07[0]"],
  ["distributions_taxpayer",      "topmostSubform[0].Page1[0].f1_10[0]"],
  ["distributions_spouse",        "topmostSubform[0].Page1[0].f1_11[0]"],
  ["agi",                         "topmostSubform[0].Page1[0].f1_15[0]"],
  ["income_tax_liability",        "topmostSubform[0].Page1[0].f1_17[0]"],
];

export const form8880Pdf: PdfFormDescriptor = {
  pendingKey: "form8880",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  PDF_FIELD_MAP,
};
