import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8962 (2025) AcroForm field names.
// Premium Tax Credit (PTC).
// Name/SSN header fields skipped.
// Part I  — Annual and Monthly Contribution Amount.
// Part II — Premium Tax Credit Claim and Reconciliation.
// household_size               → line 1  (family size)
// household_income             → line 2a (modified AGI)
// federal_poverty_line         → line 2b (federal poverty line)
// federal_poverty_pct          → line 2c (household income as % of FPL)
// annual_premium               → line 11a (annual applicable premium)
// annual_slcsp                 → line 11b (annual SLCSP premium)
// annual_applicable_contribution → line 11c (annual contribution amount)
// annual_max_ptc               → line 11d (annual max premium tax credit)
// annual_aptc                  → line 11e (annual advance payment of PTC)
// net_premium_tax_credit       → line 26 (net premium tax credit)
// excess_advance_premium       → line 29 (excess advance premium tax credit repayment)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "household_size", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "household_income", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "federal_poverty_line", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "federal_poverty_pct", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "annual_premium", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "annual_slcsp", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "annual_applicable_contribution", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "annual_max_ptc", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
  { kind: "text", domainKey: "annual_aptc", pdfField: "topmostSubform[0].Page1[0].Part2Table1[0].BodyRow1[0].f1_13[0]" },
  { kind: "text", domainKey: "net_premium_tax_credit", pdfField: "topmostSubform[0].Page2[0].f2_3[0]" },
  { kind: "text", domainKey: "excess_advance_premium", pdfField: "topmostSubform[0].Page2[0].Lines30e-g[0].f2_6[0]" },
];

export const form8962Pdf: PdfFormDescriptor = {
  pendingKey: "form8962",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8962.pdf",
  fields,
};
