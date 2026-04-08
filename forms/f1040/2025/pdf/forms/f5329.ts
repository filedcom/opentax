import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["early_distribution",             "topmostSubform[0].Page1[0].f1_03[0]"],
  ["simple_ira_early_distribution",  "topmostSubform[0].Page1[0].f1_10[0]"],
  ["esa_able_distribution",          "topmostSubform[0].Page1[0].f1_29[0]"],
  ["excess_traditional_ira",         "topmostSubform[0].Page1[0].f1_30[0]"],
  ["traditional_ira_value",          "topmostSubform[0].Page1[0].f1_33[0]"],
  ["excess_roth_ira",                "topmostSubform[0].Page2[0].f2_01[0]"],
  ["roth_ira_value",                 "topmostSubform[0].Page2[0].f2_04[0]"],
  ["excess_coverdell_esa",           "topmostSubform[0].Page2[0].f2_05[0]"],
  ["coverdell_esa_value",            "topmostSubform[0].Page2[0].f2_08[0]"],
  ["excess_archer_msa",              "topmostSubform[0].Page2[0].f2_09[0]"],
  ["archer_msa_value",               "topmostSubform[0].Page2[0].f2_12[0]"],
  ["excess_hsa",                     "topmostSubform[0].Page2[0].f2_13[0]"],
  ["hsa_value",                      "topmostSubform[0].Page2[0].f2_16[0]"],
  ["excess_able",                    "topmostSubform[0].Page2[0].f2_21[0]"],
  ["able_value",                     "topmostSubform[0].Page2[0].f2_24[0]"],
];

export const form5329Pdf: PdfFormDescriptor = {
  pendingKey: "form5329",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5329.pdf",
  PDF_FIELD_MAP,
};
