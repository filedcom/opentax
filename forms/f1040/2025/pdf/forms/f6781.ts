import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 6781 (2025) AcroForm field names.
// Part I  — Section 1256 contracts mark-to-market.
// Part II — Losses from Section 1256 contracts carryback.
// Part III — Unrecognized gains from positions held at end of year.
// Name/SSN fields skipped.
// net_section_1256_gain    → line 1 (net gain or loss from Form 6781)
// prior_year_loss_carryover → line 5 (loss carryover from prior year)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "net_section_1256_gain", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row1[0].f1_03[0]" },
  { kind: "text", domainKey: "prior_year_loss_carryover", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row3[0].f1_10[0]" },
];

export const form6781Pdf: PdfFormDescriptor = {
  pendingKey: "form6781",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6781.pdf",
  fields,
};
