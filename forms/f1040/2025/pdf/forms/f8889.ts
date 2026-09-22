import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8889 (2025) AcroForm field names.
// Verified against the f8889--2025.pdf AcroForm field dump (single page,
// strictly in reading order):
//   f1_1 = name, f1_2 = SSN
//   c1_1[0] = line 1 Self-only (/1), c1_1[1] = line 1 Family (/2)
//   f1_3–f1_14 = Part I lines 2–13
//   f1_15–f1_19 = Part II lines 14a–16, c1_2 = 17a exception box, f1_20 = 17b
//   f1_21–f1_24 = Part III lines 18–21
//
// print_* keys are self-emitted by the form8889 node. Lines 2 and 13 print an
// explicit "0" (printZero) — both are meaningful declared amounts when the
// only HSA funding is employer contributions.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Line 1: HDHP coverage type ──────────────────────────────────────────────
  { kind: "checkboxWhen", domainKey: "print_line1_coverage", pdfField: "topmostSubform[0].Page1[0].c1_1[0]", whenValue: "self_only" },
  { kind: "checkboxWhen", domainKey: "print_line1_coverage", pdfField: "topmostSubform[0].Page1[0].c1_1[1]", whenValue: "family" },

  // ── Part I: Contributions and deduction ─────────────────────────────────────
  { kind: "text", domainKey: "print_line2_taxpayer_contributions", pdfField: "topmostSubform[0].Page1[0].f1_3[0]", printZero: true },
  { kind: "text", domainKey: "print_line3_limit", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "print_line4_archer", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "print_line5", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "print_line6", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "print_line8", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "print_line9_employer", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "print_line11", pdfField: "topmostSubform[0].Page1[0].f1_12[0]" },
  { kind: "text", domainKey: "print_line12", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "print_line13_deduction", pdfField: "topmostSubform[0].Page1[0].f1_14[0]", printZero: true },

  // ── Part II: Distributions ──────────────────────────────────────────────────
  { kind: "text", domainKey: "print_line14a_distributions", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "print_line14c", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "print_line15_qualified", pdfField: "topmostSubform[0].Page1[0].f1_18[0]" },
  { kind: "text", domainKey: "print_line16_taxable", pdfField: "topmostSubform[0].Page1[0].f1_19[0]" },
];

export const form8889Pdf: PdfFormDescriptor = {
  pendingKey: "form8889",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8889--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  ],
};
