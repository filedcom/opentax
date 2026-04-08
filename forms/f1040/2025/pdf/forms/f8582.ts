import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "passive_schedule_c", pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
  { kind: "text", domainKey: "passive_schedule_f", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "current_income", pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
  { kind: "text", domainKey: "current_loss", pdfField: "topmostSubform[0].Page1[0].f1_08[0]" },
  { kind: "text", domainKey: "prior_unallowed", pdfField: "topmostSubform[0].Page1[0].f1_09[0]" },
  { kind: "text", domainKey: "modified_agi", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "active_participation", pdfField: "topmostSubform[0].Page1[0].Table_Part4[0].Row1[0].f1_22[0]" },
];

export const form8582Pdf: PdfFormDescriptor = {
  pendingKey: "form8582",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8582.pdf",
  fields,
};
