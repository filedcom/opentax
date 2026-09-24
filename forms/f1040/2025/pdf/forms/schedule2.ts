import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 2 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf
//
// Personal information occupies f1_01 and f1_02. The 2025 redesign then uses
// f1_03 through f1_13 for Part I and f1_15 onward for Part II amounts.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: AMT ──────────────────────────────────────────────────────────────
  { kind: "text", domainKey: "line1_amt", pdfField: "form1[0].Page1[0].f1_12[0]" },

  // ── Part II: Other Taxes ─────────────────────────────────────────────────────
  { kind: "text", domainKey: "line4_se_tax", pdfField: "form1[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "line5_unreported_tip_tax", pdfField: "form1[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "line6_uncollected_8919", pdfField: "form1[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "line8_form5329_tax", pdfField: "form1[0].Page1[0].f1_19[0]" },
  { kind: "text", domainKey: "line11_additional_medicare", pdfField: "form1[0].Page1[0].f1_22[0]" },
  { kind: "text", domainKey: "line12_niit", pdfField: "form1[0].Page1[0].f1_23[0]" },
];

export const schedule2Pdf: PdfFormDescriptor = {
  pendingKey: "schedule2",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf",
  fields,
};
