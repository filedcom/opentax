import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "ira_contributions_taxpayer", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow1[0].f1_3[0]" },
  { kind: "text", domainKey: "ira_contributions_spouse", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow1[0].f1_4[0]" },
  { kind: "text", domainKey: "elective_deferrals_taxpayer", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow2[0].f1_5[0]" },
  { kind: "text", domainKey: "elective_deferrals_spouse", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow2[0].f1_6[0]" },
  { kind: "text", domainKey: "elective_deferrals", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow3[0].f1_7[0]" },
  { kind: "text", domainKey: "distributions_taxpayer", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow4[0].f1_10[0]" },
  { kind: "text", domainKey: "distributions_spouse", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow5[0].f1_11[0]" },
  { kind: "text", domainKey: "agi", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "income_tax_liability", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
];

export const form8880Pdf: PdfFormDescriptor = {
  pendingKey: "form8880",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8880.pdf",
  fields,
};
