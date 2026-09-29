import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8960 (2025) AcroForm field names.
// Net Investment Income Tax — Individuals, Estates, and Trusts.
// Name/SSN header fields skipped.
// Part I  — Net Investment Income.
// Part II — Modified Adjusted Gross Income.
// Part III — Tax Computation.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "line1_taxable_interest",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "line2_ordinary_dividends",
    pdfField: "topmostSubform[0].Page1[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "line3_annuities",
    pdfField: "topmostSubform[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "line4a_passive_income",
    pdfField: "topmostSubform[0].Page1[0].f1_6[0]",
  },
  {
    kind: "text",
    domainKey: "line4b_rental_net",
    pdfField: "topmostSubform[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "line4c_combined",
    pdfField: "topmostSubform[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "line5a_net_gain",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "line5b_net_gain_adjustment",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line5d_combined",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "line7_other_modifications",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "line8_total_investment_income",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line9a_investment_interest_expense",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "line9b_state_local_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line9d_total_expenses",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "line10_additional_modifications",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
  },
  {
    kind: "text",
    domainKey: "line11_total_deductions",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "line12_net_investment_income",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line13_magi",
    pdfField: "topmostSubform[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "line14_threshold",
    pdfField: "topmostSubform[0].Page1[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "line15_magi_excess",
    pdfField: "topmostSubform[0].Page1[0].f1_25[0]",
  },
  {
    kind: "text",
    domainKey: "line16_taxable_base",
    pdfField: "topmostSubform[0].Page1[0].f1_26[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line17_niit",
    pdfField: "topmostSubform[0].Page1[0].f1_27[0]",
    printZero: true,
  },
];

export const form8960Pdf: PdfFormDescriptor = {
  pendingKey: "form8960",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8960--2025.pdf",
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "fullName",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
  // The 2025 instructions require Form 8960 when MAGI exceeds the filing
  // threshold, even if deductions reduce net investment income to zero.
  includeWhen: (fields) =>
    typeof fields["line13_magi"] === "number" &&
    typeof fields["line14_threshold"] === "number" &&
    fields["line13_magi"] > fields["line14_threshold"],
};
