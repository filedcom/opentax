import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 5329 (2025) AcroForm field names.
// Multi-part form (Parts I–X). Each part has an "amount" field as the first
// numeric entry. Name/SSN fields skipped.
// Part I   — early distribution (IRA/qualified plan): line 1.
// Part I   — SIMPLE IRA early distribution: line 1 (separate).
// Part III — ESA/ABLE distribution: line 17.
// Part III — excess traditional IRA contributions: line 18.
// Part III — traditional IRA FMV: line 21.
// Part IV  — excess Roth IRA: line 22.
// Part IV  — Roth IRA FMV: line 25.
// Part V   — excess Coverdell ESA: line 26.
// Part V   — Coverdell ESA FMV: line 29.
// Part VI  — excess Archer MSA: line 30.
// Part VI  — Archer MSA FMV: line 33.
// Part VII — excess HSA: line 34.
// Part VII — HSA FMV: line 37.
// Part IX  — excess ABLE: line 42.
// Part IX  — ABLE FMV: line 45.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "early_distribution", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "simple_ira_early_distribution", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "esa_able_distribution", pdfField: "topmostSubform[0].Page1[0].f1_29[0]" },
  { kind: "text", domainKey: "excess_traditional_ira", pdfField: "topmostSubform[0].Page1[0].f1_30[0]" },
  { kind: "text", domainKey: "traditional_ira_value", pdfField: "topmostSubform[0].Page1[0].f1_33[0]" },
  { kind: "text", domainKey: "excess_roth_ira", pdfField: "topmostSubform[0].Page2[0].f2_1[0]" },
  { kind: "text", domainKey: "roth_ira_value", pdfField: "topmostSubform[0].Page2[0].f2_4[0]" },
  { kind: "text", domainKey: "excess_coverdell_esa", pdfField: "topmostSubform[0].Page2[0].f2_5[0]" },
  { kind: "text", domainKey: "coverdell_esa_value", pdfField: "topmostSubform[0].Page2[0].f2_8[0]" },
  { kind: "text", domainKey: "excess_archer_msa", pdfField: "topmostSubform[0].Page2[0].f2_9[0]" },
  { kind: "text", domainKey: "archer_msa_value", pdfField: "topmostSubform[0].Page2[0].f2_12[0]" },
  { kind: "text", domainKey: "excess_hsa", pdfField: "topmostSubform[0].Page2[0].f2_13[0]" },
  { kind: "text", domainKey: "hsa_value", pdfField: "topmostSubform[0].Page2[0].f2_16[0]" },
  { kind: "text", domainKey: "excess_able", pdfField: "topmostSubform[0].Page2[0].f2_21[0]" },
  { kind: "text", domainKey: "able_value", pdfField: "topmostSubform[0].Page2[0].f2_24[0]" },
];

export const form5329Pdf: PdfFormDescriptor = {
  pendingKey: "form5329",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5329.pdf",
  fields,
};
