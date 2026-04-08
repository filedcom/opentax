import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule D (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sd.pdf
//
// Part I Short-Term (lines 1a–7):
//   f1_01/f1_02 = Line 1a proceeds/cost (totals reported on Form 1099-B)
//   f1_07/f1_08 = Line 1b proceeds/cost (basis reported)
//   f1_13       = Line 4 short-term from other forms
//   f1_14       = Line 5 net short-term gain/loss from K-1s
//   f1_15       = Line 6 short-term carryover
// Part II Long-Term (lines 8a–15):
//   f1_17/f1_18 = Line 8a proceeds/cost (totals not reported on 1099-B)
//   f1_25       = Line 11 gain from Form 2439
//   f1_26       = Line 12 net long-term gain/loss from K-1s
//   f1_27       = Line 13 capital gain distributions
//   f1_28       = Line 14 long-term carryover
// Part III Summary (lines 16–22):
//   f2_01       = Line 19 unrecaptured Section 1250 gain

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Part I: Short-Term ───────────────────────────────────────────────────────
  ["line_1a_proceeds",          "topmostSubform[0].Page1[0].f1_01[0]"],
  ["line_1a_cost",              "topmostSubform[0].Page1[0].f1_02[0]"],
  ["line_4_other_st",           "topmostSubform[0].Page1[0].f1_13[0]"],
  ["line_5_k1_st",              "topmostSubform[0].Page1[0].f1_14[0]"],
  ["line_6_carryover",          "topmostSubform[0].Page1[0].f1_15[0]"],

  // ── Part II: Long-Term ───────────────────────────────────────────────────────
  ["line_8a_proceeds",          "topmostSubform[0].Page1[0].f1_17[0]"],
  ["line_8a_cost",              "topmostSubform[0].Page1[0].f1_18[0]"],
  ["line_11_form2439",          "topmostSubform[0].Page1[0].f1_25[0]"],
  ["line_12_k1_lt",             "topmostSubform[0].Page1[0].f1_26[0]"],
  ["line13_cap_gain_distrib",   "topmostSubform[0].Page1[0].f1_27[0]"],
  ["line_14_carryover",         "topmostSubform[0].Page1[0].f1_28[0]"],

  // ── Part III: Summary ────────────────────────────────────────────────────────
  ["line19_unrecaptured_1250",  "topmostSubform[0].Page2[0].f2_01[0]"],
];

export const scheduleDPdf: PdfFormDescriptor = {
  pendingKey: "schedule_d",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sd.pdf",
  PDF_FIELD_MAP,
};
