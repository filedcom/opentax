import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule B (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sb.pdf
//
// Part I Interest:
//   Payer name/amount table rows (skip — not computed fields)
//   f1_NN = Line 2 total taxable interest (after EE bond exclusion)
//   f1_NN = Line 3 EE bond exclusion (Form 8815)
// Part II Ordinary Dividends:
//   Payer name/amount table rows (skip — not computed fields)
//   f1_NN = Line 6 total ordinary dividends
//
// The form has two payer-detail tables (Part I and II) with ~15 rows each.
// Summary totals fall after all the table rows:
//   taxable_interest_net → last interest total field
//   ee_bond_exclusion    → EE bond exclusion field
//   ordinaryDividends    → last dividends total field

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Part I: Interest ─────────────────────────────────────────────────────────
  ["taxable_interest_net",  "topmostSubform[0].Page1[0].f1_29[0]"],
  ["ee_bond_exclusion",     "topmostSubform[0].Page1[0].f1_30[0]"],

  // ── Part II: Dividends ───────────────────────────────────────────────────────
  ["ordinaryDividends",     "topmostSubform[0].Page1[0].f1_49[0]"],
];

export const scheduleBPdf: PdfFormDescriptor = {
  pendingKey: "schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sb.pdf",
  PDF_FIELD_MAP,
};
