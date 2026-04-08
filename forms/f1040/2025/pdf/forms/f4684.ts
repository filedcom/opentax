import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4684 (2025) AcroForm field names.
// Section A (personal use property) — lines 1–17.
// Section B (business/income-producing property) — lines 19–33.
// Name/description fields are skipped; only numeric amount fields mapped.
const fields: ReadonlyArray<PdfFieldEntry> = [
  // Section A — personal
  { kind: "text", domainKey: "personal_fmv_before", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "personal_fmv_after", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].RowA[0].f1_5[0]" },
  { kind: "text", domainKey: "personal_basis", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].RowA[0].f1_6[0]" },
  { kind: "text", domainKey: "personal_insurance", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].RowB[0].f1_9[0]" },
  { kind: "text", domainKey: "agi", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].RowC[0].f1_14[0]" },
  // Section B — business
  { kind: "text", domainKey: "business_fmv_before", pdfField: "topmostSubform[0].Page1[0].Table_Lines2-9[0].Line2[0].f1_21[0]" },
  { kind: "text", domainKey: "business_fmv_after", pdfField: "topmostSubform[0].Page1[0].Table_Lines2-9[0].Line2[0].f1_22[0]" },
  { kind: "text", domainKey: "business_basis", pdfField: "topmostSubform[0].Page1[0].Table_Lines2-9[0].Line2[0].f1_23[0]" },
  { kind: "text", domainKey: "business_insurance", pdfField: "topmostSubform[0].Page1[0].Table_Lines2-9[0].Line3[0].f1_26[0]" },
];

export const form4684Pdf: PdfFormDescriptor = {
  pendingKey: "form4684",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4684.pdf",
  fields,
};
