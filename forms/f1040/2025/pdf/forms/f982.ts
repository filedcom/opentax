import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 982 (2025) AcroForm field names.
// Line 2: excluded COD income amount — first numeric field after checkboxes.
// Line 2 insolvency: further down in Part I.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line2_excluded_cod", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "insolvency_amount", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
];

export const form982Pdf: PdfFormDescriptor = {
  pendingKey: "form982",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f982.pdf",
  fields,
};
