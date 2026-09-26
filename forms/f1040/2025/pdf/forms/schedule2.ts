import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 2 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf
//
// Personal information occupies f1_01 and f1_02. The 2025 redesign then uses
// f1_03 through f1_13 for Part I and f1_15 onward for Part II amounts.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: additions to tax and AMT ────────────────────────────────────────
  { kind: "text", domainKey: "line1a_excess_advance_premium", pdfField: "form1[0].Page1[0].Line1a_ReadOrder[0].f1_03[0]" },
  { kind: "text", domainKey: "line2_amt", pdfField: "form1[0].Page1[0].f1_12[0]" },

  // ── Part II: Other Taxes ─────────────────────────────────────────────────────
  { kind: "text", domainKey: "line4_se_tax", pdfField: "form1[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "line5_unreported_tip_tax", pdfField: "form1[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "line6_uncollected_8919", pdfField: "form1[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "line8_form5329_tax", pdfField: "form1[0].Page1[0].f1_19[0]" },
  { kind: "text", domainKey: "line11_additional_medicare", pdfField: "form1[0].Page1[0].f1_22[0]" },
  { kind: "text", domainKey: "line12_niit", pdfField: "form1[0].Page1[0].f1_23[0]" },
  { kind: "text", domainKey: "line17z_description", pdfField: "form1[0].Page2[0].Line17z_ReadOrder[0].f2_19[0]" },
  { kind: "text", domainKey: "line17z_amount", pdfField: "form1[0].Page2[0].f2_20[0]" },
  { kind: "text", domainKey: "line21_total", pdfField: "form1[0].Page2[0].f2_24[0]" },
];

export const schedule2Pdf: PdfFormDescriptor = {
  pendingKey: "schedule2",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf",
  fields,
  projectFields(fields, allPending) {
    const worksheet = allPending.form8978_reporting_year;
    const reduction = worksheet?.schedule2_line17z_reduction;
    if (typeof reduction !== "number" || reduction <= 0) return fields;
    return {
      ...fields,
      line17z_description: "Form 8978 ADJ",
      line17z_amount: `(${Math.round(reduction)})`,
      line21_total: worksheet?.schedule2_line21,
    };
  },
};
