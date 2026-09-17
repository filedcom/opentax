import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 982 (March 2018) AcroForm field names. This remains the current
// revision for TY2025; the IRS has not published a 2025-specific Form 982.
// Line 2: excluded COD income amount — first numeric field after checkboxes.
// Line 2 insolvency: further down in Part I.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line2_excluded_cod", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "insolvency_amount", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
];

export const form982Pdf: PdfFormDescriptor = {
  pendingKey: "form982",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f982--2018.pdf",
  fields,
};
