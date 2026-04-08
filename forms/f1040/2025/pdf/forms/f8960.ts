import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8960 (2025) AcroForm field names.
// Net Investment Income Tax — Individuals, Estates, and Trusts.
// Name/SSN header fields skipped.
// Part I  — Net Investment Income.
// Part II — Modified Adjusted Gross Income.
// Part III — Tax Computation.
// line1_taxable_interest        → line 1  (taxable interest)
// line2_ordinary_dividends      → line 2  (ordinary dividends)
// line3_annuities               → line 3  (annuities from nonqualified plans)
// line4a_passive_income         → line 4a (passive activity net income/loss)
// line4b_rental_net             → line 4b (adjusted net income/loss from non-§1411)
// line5a_net_gain               → line 5a (net gain/loss on property dispositions)
// line5b_net_gain_adjustment    → line 5b (non-NIIT property disposition adjustment)
// line7_other_modifications     → line 7  (other modifications)
// line9a_investment_interest_expense → line 9a (investment interest expense)
// line9b_state_local_tax        → line 9b (state, local, foreign income taxes)
// line10_additional_modifications → line 10 (additional modifications)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1_taxable_interest", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "line2_ordinary_dividends", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "line3_annuities", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "line4a_passive_income", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "line4b_rental_net", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "line5a_net_gain", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
  { kind: "text", domainKey: "line5b_net_gain_adjustment", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "line7_other_modifications", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "line9a_investment_interest_expense", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "line9b_state_local_tax", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "line10_additional_modifications", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
];

export const form8960Pdf: PdfFormDescriptor = {
  pendingKey: "form8960",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8960.pdf",
  fields,
};
