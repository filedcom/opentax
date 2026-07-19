import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule D (2025) AcroForm field names.
// Verified against the f1040sd--2025.pdf AcroForm field dump.
//
// Page 1:
//   f1_1 = name, f1_2 = SSN, c1_1[0]/c1_1[1] = QOF disposition Yes(/1)/No(/2)
//   Part I (short-term) table — columns (d) proceeds, (e) cost, (g) adjustment,
//   (h) gain/loss:
//     Row1a f1_3–f1_6, Row1b f1_7–f1_10, Row2 f1_11–f1_14, Row3 f1_15–f1_18
//     f1_19 = line 4, f1_20 = line 5, f1_21 = line 6 carryover, f1_22 = line 7
//   Part II (long-term) table:
//     Row8a f1_23–f1_26, Row8b f1_27–f1_30, Row9 f1_31–f1_34, Row10 f1_35–f1_38
//     f1_39 = line 11, f1_40 = line 12, f1_41 = line 13 capital gain
//     distributions, f1_42 = line 14 carryover, f1_43 = line 15
// Page 2:
//   f2_1 = line 16, c2_1[0]/[1] = line 17 Yes/No, f2_2 = line 18 (28% rate
//   gain), f2_3 = line 19 (unrecaptured §1250), c2_2[0]/[1] = line 20 Yes/No,
//   f2_4 = line 21 loss limit, c2_3[0]/[1] = line 22 Yes/No
//
// print_* keys are self-emitted by the schedule_d node.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── QOF disposition question (top of page 1) ─────────────────────────────────
  { kind: "checkboxWhen", domainKey: "print_qof_disposition", pdfField: "topmostSubform[0].Page1[0].c1_1[0]", whenValue: "true" },
  { kind: "checkboxWhen", domainKey: "print_qof_disposition", pdfField: "topmostSubform[0].Page1[0].c1_1[1]", whenValue: "false" },

  // ── Part I: Short-Term — line 1a direct-reported totals ─────────────────────
  { kind: "text", domainKey: "print_line1a_proceeds", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_3[0]" },
  { kind: "text", domainKey: "print_line1a_cost", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_4[0]" },
  { kind: "text", domainKey: "print_line1a_gain", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].Row1a[0].f1_6[0]" },
  { kind: "text", domainKey: "line_4_other_st", pdfField: "topmostSubform[0].Page1[0].f1_19[0]" },
  { kind: "text", domainKey: "line_5_k1_st", pdfField: "topmostSubform[0].Page1[0].f1_20[0]" },
  { kind: "text", domainKey: "line_6_carryover", pdfField: "topmostSubform[0].Page1[0].f1_21[0]" },
  { kind: "text", domainKey: "print_line7_st_total", pdfField: "topmostSubform[0].Page1[0].f1_22[0]" },

  // ── Part II: Long-Term — line 8a direct-reported totals ─────────────────────
  { kind: "text", domainKey: "print_line8a_proceeds", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_23[0]" },
  { kind: "text", domainKey: "print_line8a_cost", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_24[0]" },
  { kind: "text", domainKey: "print_line8a_gain", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row8a[0].f1_26[0]" },
  { kind: "text", domainKey: "line_11_form2439", pdfField: "topmostSubform[0].Page1[0].f1_39[0]" },
  { kind: "text", domainKey: "line_12_k1_lt", pdfField: "topmostSubform[0].Page1[0].f1_40[0]" },
  { kind: "text", domainKey: "print_line13_cap_gain_distrib", pdfField: "topmostSubform[0].Page1[0].f1_41[0]" },
  { kind: "text", domainKey: "line_14_carryover", pdfField: "topmostSubform[0].Page1[0].f1_42[0]" },
  { kind: "text", domainKey: "print_line15_lt_total", pdfField: "topmostSubform[0].Page1[0].f1_43[0]" },

  // ── Part III: Summary (page 2) ───────────────────────────────────────────────
  { kind: "text", domainKey: "print_line16_combined", pdfField: "topmostSubform[0].Page2[0].f2_1[0]" },
  { kind: "checkboxWhen", domainKey: "print_line17_both_gains", pdfField: "topmostSubform[0].Page2[0].c2_1[0]", whenValue: "true" },
  { kind: "checkboxWhen", domainKey: "print_line17_both_gains", pdfField: "topmostSubform[0].Page2[0].c2_1[1]", whenValue: "false" },
  { kind: "text", domainKey: "print_line18_28pct", pdfField: "topmostSubform[0].Page2[0].f2_2[0]" },
  { kind: "text", domainKey: "print_line19_unrecaptured_1250", pdfField: "topmostSubform[0].Page2[0].f2_3[0]" },
  { kind: "checkboxWhen", domainKey: "print_line20_qdcgt", pdfField: "topmostSubform[0].Page2[0].c2_2[0]", whenValue: "true" },
  { kind: "checkboxWhen", domainKey: "print_line20_qdcgt", pdfField: "topmostSubform[0].Page2[0].c2_2[1]", whenValue: "false" },
  { kind: "text", domainKey: "print_line21_loss", pdfField: "topmostSubform[0].Page2[0].f2_4[0]" },
];

export const scheduleDPdf: PdfFormDescriptor = {
  pendingKey: "schedule_d",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sd--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  ],
};
