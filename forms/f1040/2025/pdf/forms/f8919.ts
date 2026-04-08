import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8919 (2025) AcroForm field names.
// Uncollected Social Security and Medicare Tax on Wages.
// Name/SSN/firm name/reason code fields skipped.
// wages          → line 6  (total wages subject to uncollected SS/Medicare)
// prior_ss_wages → line 9  (total SS wages reported on prior W-2s)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["wages",          "topmostSubform[0].Page1[0].f1_08[0]"],
  ["prior_ss_wages", "topmostSubform[0].Page1[0].f1_11[0]"],
];

export const form8919Pdf: PdfFormDescriptor = {
  pendingKey: "form8919",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8919.pdf",
  PDF_FIELD_MAP,
};
