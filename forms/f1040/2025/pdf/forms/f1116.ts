import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 1116 (2025) AcroForm field names.
// Part I  — foreign income: line 1a column A (approx f1_07 range).
// Part I  — total income: line 6 total (approx f1_47 range).
// Part II — taxes paid/accrued: approx f1_50 range.
// Part III — US tax before credits: page 2 line 9 (approx f2_02 range).
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineA-B_ReadOrder[0].c1_1[0]", whenValue: "section_951a" },
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineA-B_ReadOrder[0].c1_1[1]", whenValue: "branch" },
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineC-D_ReadOrder[0].c1_1[0]", whenValue: "passive" },
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineC-D_ReadOrder[0].c1_1[1]", whenValue: "general" },
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineE-F_ReadOrder[0].c1_1[0]", whenValue: "section_901j" },
  { kind: "checkboxWhen", domainKey: "income_category", pdfField: "topmostSubform[0].Page1[0].LineE-F_ReadOrder[0].c1_1[1]", whenValue: "treaty" },
  { kind: "text", domainKey: "foreign_income", pdfField: "topmostSubform[0].Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Line1a_Text[0].f1_07[0]" },
  { kind: "text", domainKey: "total_income", pdfField: "topmostSubform[0].Page1[0].Table_Part1_Lines2-6[0].Line6[0].f1_47[0]" },
  { kind: "text", domainKey: "foreign_tax_paid", pdfField: "topmostSubform[0].Page1[0].f1_50[0]" },
  { kind: "text", domainKey: "us_tax_before_credits", pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
];

export const form1116Pdf: PdfFormDescriptor = {
  pendingKey: "form_1116",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1116--2025.pdf",
  // The §904 limitation inputs land here on every return; only a claimed credit
  // puts the form on the return.
  presenceKey: "foreign_tax_paid",
  instances(fields) {
    const summaries = fields.category_summaries;
    if (!Array.isArray(summaries) || summaries.length === 0) return [fields];
    return summaries.map((summary) => {
      const category = summary as Record<string, unknown>;
      return {
        ...fields,
        income_category: category.category,
        foreign_tax_paid: category.foreignTaxPaid,
        foreign_income: category.foreignGrossIncome,
      };
    });
  },
  fields,
};
