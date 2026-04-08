import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["line1_taxable_interest",           "topmostSubform[0].Page1[0].f1_03[0]"],
  ["line2_ordinary_dividends",         "topmostSubform[0].Page1[0].f1_04[0]"],
  ["line3_annuities",                  "topmostSubform[0].Page1[0].f1_05[0]"],
  ["line4a_passive_income",            "topmostSubform[0].Page1[0].f1_06[0]"],
  ["line4b_rental_net",                "topmostSubform[0].Page1[0].f1_07[0]"],
  ["line5a_net_gain",                  "topmostSubform[0].Page1[0].f1_08[0]"],
  ["line5b_net_gain_adjustment",       "topmostSubform[0].Page1[0].f1_09[0]"],
  ["line7_other_modifications",        "topmostSubform[0].Page1[0].f1_11[0]"],
  ["line9a_investment_interest_expense","topmostSubform[0].Page1[0].f1_14[0]"],
  ["line9b_state_local_tax",           "topmostSubform[0].Page1[0].f1_15[0]"],
  ["line10_additional_modifications",  "topmostSubform[0].Page1[0].f1_16[0]"],
];

export const form8960Pdf: PdfFormDescriptor = {
  pendingKey: "form8960",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8960.pdf",
  PDF_FIELD_MAP,
};
