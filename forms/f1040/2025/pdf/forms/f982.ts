import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 982 (2025) AcroForm field names.
// Line 2: excluded COD income amount — first numeric field after checkboxes.
// Line 2 insolvency: further down in Part I.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["line2_excluded_cod",  "topmostSubform[0].Page1[0].f1_07[0]"],
  ["insolvency_amount",   "topmostSubform[0].Page1[0].f1_08[0]"],
];

export const form982Pdf: PdfFormDescriptor = {
  pendingKey: "form982",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f982.pdf",
  PDF_FIELD_MAP,
};
