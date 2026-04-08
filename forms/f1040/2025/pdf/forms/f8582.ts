import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8582 (2025) AcroForm field names.
// Passive Activity Loss Limitations.
// Name/SSN fields skipped.
// Part I — Rental real estate activities with active participation:
//   passive_schedule_c   → line 1a (net income from Schedule C passive activities)
//   passive_schedule_f   → line 1b (net loss from Schedule F passive activities)
//   current_income       → line 1c (prior-year unallowed losses)
//   current_loss         → line 2a (net income from other passive activities)
//   prior_unallowed      → line 2b (net loss from other passive activities)
// Part II — Special allowance for rental real estate:
//   modified_agi         → line 7  (modified adjusted gross income)
//   active_participation → line 13 (special allowance)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["passive_schedule_c",  "topmostSubform[0].Page1[0].f1_03[0]"],
  ["passive_schedule_f",  "topmostSubform[0].Page1[0].f1_04[0]"],
  ["current_income",      "topmostSubform[0].Page1[0].f1_05[0]"],
  ["current_loss",        "topmostSubform[0].Page1[0].f1_08[0]"],
  ["prior_unallowed",     "topmostSubform[0].Page1[0].f1_09[0]"],
  ["modified_agi",        "topmostSubform[0].Page1[0].f1_16[0]"],
  ["active_participation","topmostSubform[0].Page1[0].f1_22[0]"],
];

export const form8582Pdf: PdfFormDescriptor = {
  pendingKey: "form8582",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582.pdf",
  PDF_FIELD_MAP,
};
