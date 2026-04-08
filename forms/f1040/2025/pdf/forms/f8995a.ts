import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8995-A (2025) AcroForm field names.
// Qualified Business Income Deduction.
// Name/SSN header fields skipped.
// taxable_income        → line 1  (taxable income before QBI deduction)
// net_capital_gain      → line 2  (net capital gain)
// qbi                   → line 3  (QBI component)
// w2_wages              → line 4  (W-2 wages)
// unadjusted_basis      → line 5  (unadjusted basis of qualified property)
// sstb_qbi              → line 6  (SSTB QBI)
// sstb_w2_wages         → line 7  (SSTB W-2 wages)
// sstb_unadjusted_basis → line 8  (SSTB unadjusted basis)
// line6_sec199a_dividends → line 6 (Section 199A dividends)
// qbi_loss_carryforward → line 16 (QBI loss carryforward)
// reit_loss_carryforward → line 17 (REIT/PTP loss carryforward)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["taxable_income",         "topmostSubform[0].Page1[0].f1_03[0]"],
  ["net_capital_gain",       "topmostSubform[0].Page1[0].f1_04[0]"],
  ["qbi",                    "topmostSubform[0].Page1[0].f1_05[0]"],
  ["w2_wages",               "topmostSubform[0].Page1[0].f1_06[0]"],
  ["unadjusted_basis",       "topmostSubform[0].Page1[0].f1_07[0]"],
  ["sstb_qbi",               "topmostSubform[0].Page1[0].f1_08[0]"],
  ["sstb_w2_wages",          "topmostSubform[0].Page1[0].f1_09[0]"],
  ["sstb_unadjusted_basis",  "topmostSubform[0].Page1[0].f1_10[0]"],
  ["line6_sec199a_dividends","topmostSubform[0].Page1[0].f1_11[0]"],
  ["qbi_loss_carryforward",  "topmostSubform[0].Page1[0].f1_14[0]"],
  ["reit_loss_carryforward", "topmostSubform[0].Page1[0].f1_15[0]"],
];

export const form8995aPdf: PdfFormDescriptor = {
  pendingKey: "form8995a",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  PDF_FIELD_MAP,
};
