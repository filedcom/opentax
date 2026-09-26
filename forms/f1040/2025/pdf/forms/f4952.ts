import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4952 (2025) AcroForm field names.
// 2025 IRS AcroForm: f1_01/f1_02 are the header, f1_03–f1_17 are lines 1–8.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "investment_interest_expense", pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
  { kind: "text", domainKey: "prior_year_carryforward", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "total_investment_interest", pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
  { kind: "text", domainKey: "gross_investment_income", pdfField: "topmostSubform[0].Page1[0].Line4a_ReadOrder[0].f1_06[0]" },
  { kind: "text", domainKey: "qualified_dividends", pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
  { kind: "text", domainKey: "nonqualified_investment_income", pdfField: "topmostSubform[0].Page1[0].f1_08[0]" },
  { kind: "text", domainKey: "investment_net_gain", pdfField: "topmostSubform[0].Page1[0].f1_09[0]" },
  { kind: "text", domainKey: "investment_net_capital_gain", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "noncapital_investment_gain", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "elected_investment_income", pdfField: "topmostSubform[0].Page1[0].f1_12[0]" },
  { kind: "text", domainKey: "investment_income", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "investment_expenses", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "net_investment_income", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "disallowed_interest_carryforward", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "allowed_interest", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
];

export const form4952Pdf: PdfFormDescriptor = {
  pendingKey: "form4952",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  fields,
};
