import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8606 (2025) AcroForm field names.
// Verified against the f8606--2025.pdf AcroForm field dump.
//
// Page 1:
//   f1_01 = name, f1_02 = SSN
//   f1_03–f1_08 = "fill in your address only if filing by itself" block (skip)
//   Part I: f1_09 = line 1, f1_10 = line 2, f1_11 = line 3, f1_12 = line 4,
//   f1_13 = line 5, f1_14 = line 6, f1_15 = line 7, f1_16 = line 8,
//   f1_17 = line 9, f1_18/f1_19 = line 10 (split decimal), f1_20 = line 11,
//   f1_21 = line 12, f1_22 = line 13, f1_23 = line 14
// Page 2:
//   f2_01 = line 15a, f2_02 = line 15b, f2_03 = line 15c
//   Part II: f2_04 = line 16, f2_05 = line 17, f2_06 = line 18
//   Part III: f2_07+ = lines 19–25 (Roth distributions — not printed; the
//   engine's simplified Part III model omits the 5-year/ordering detail the
//   printed lines require)
//
// print_* keys are self-emitted by the form8606 node. Line 2 prints an
// explicit "0" — declared prior basis is meaningful even when zero.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: Nondeductible contributions and basis ───────────────────────────
  { kind: "text", domainKey: "print_line1_nondeductible", pdfField: "topmostSubform[0].Page1[0].f1_09[0]" },
  { kind: "text", domainKey: "print_line2_prior_basis", pdfField: "topmostSubform[0].Page1[0].f1_10[0]", printZero: true },
  { kind: "text", domainKey: "print_line3_total_basis", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "print_line6_year_end_value", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "print_line7_distributions", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "print_line8_conversions", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "print_line13_nontaxable", pdfField: "topmostSubform[0].Page1[0].f1_22[0]" },
  { kind: "text", domainKey: "print_line14_remaining_basis", pdfField: "topmostSubform[0].Page1[0].f1_23[0]" },
  { kind: "text", domainKey: "print_line15c_taxable", pdfField: "topmostSubform[0].Page2[0].f2_03[0]" },

  // ── Part II: Roth conversions ───────────────────────────────────────────────
  { kind: "text", domainKey: "print_line16_converted", pdfField: "topmostSubform[0].Page2[0].f2_04[0]" },
  { kind: "text", domainKey: "print_line18_taxable_conversion", pdfField: "topmostSubform[0].Page2[0].f2_06[0]" },
];

export const form8606Pdf: PdfFormDescriptor = {
  pendingKey: "form8606",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8606--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
  ],
};
