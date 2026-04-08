import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["household_size",               "topmostSubform[0].Page1[0].f1_03[0]"],
  ["household_income",             "topmostSubform[0].Page1[0].f1_04[0]"],
  ["federal_poverty_line",         "topmostSubform[0].Page1[0].f1_05[0]"],
  ["federal_poverty_pct",          "topmostSubform[0].Page1[0].f1_06[0]"],
  ["annual_premium",               "topmostSubform[0].Page1[0].f1_09[0]"],
  ["annual_slcsp",                 "topmostSubform[0].Page1[0].f1_10[0]"],
  ["annual_applicable_contribution","topmostSubform[0].Page1[0].f1_11[0]"],
  ["annual_max_ptc",               "topmostSubform[0].Page1[0].f1_12[0]"],
  ["annual_aptc",                  "topmostSubform[0].Page1[0].f1_13[0]"],
  ["net_premium_tax_credit",       "topmostSubform[0].Page2[0].f2_03[0]"],
  ["excess_advance_premium",       "topmostSubform[0].Page2[0].f2_06[0]"],
];

export const form8962Pdf: PdfFormDescriptor = {
  pendingKey: "form8962",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8962.pdf",
  PDF_FIELD_MAP,
};
