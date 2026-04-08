import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8995 (2025) AcroForm field names.
// Qualified Business Income Deduction — Simplified Computation.
// Name/SSN header fields skipped.
// Internal tracking fields (qbi_from_schedule_c, qbi_from_schedule_f) have no PDF fields.
// qbi                   → line 15 (total qualified business income)
// taxable_income        → line 11 (taxable income before deduction)
// net_capital_gain      → line 12 (net capital gain)
// qbi_loss_carryforward → line 16 (QBI loss carryforward to next year)
// reit_loss_carryforward → line 17 (REIT/PTP loss carryforward to next year)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["taxable_income",        "topmostSubform[0].Page1[0].f1_05[0]"],
  ["net_capital_gain",      "topmostSubform[0].Page1[0].f1_06[0]"],
  ["qbi",                   "topmostSubform[0].Page1[0].f1_09[0]"],
  ["qbi_loss_carryforward", "topmostSubform[0].Page1[0].f1_10[0]"],
  ["reit_loss_carryforward","topmostSubform[0].Page1[0].f1_11[0]"],
];

export const form8995Pdf: PdfFormDescriptor = {
  pendingKey: "form8995",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995.pdf",
  PDF_FIELD_MAP,
};
