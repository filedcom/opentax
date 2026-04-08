import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4797 (2025) AcroForm field names.
// Part I  — Section 1231 gains: line 9 total.
// Part II — ordinary gains: line 18b total.
// Part III — recapture: 1245 (line 22) and 1250 (line 26c).
// Nonrecaptured 1231 loss from prior years: line 8.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["nonrecaptured_1231_loss", "topmostSubform[0].Page1[0].f1_07[0]"],
  ["section_1231_gain",       "topmostSubform[0].Page1[0].f1_10[0]"],
  ["ordinary_gain",           "topmostSubform[0].Page1[0].f1_22[0]"],
  ["recapture_1245",          "topmostSubform[0].Page2[0].f2_09[0]"],
  ["recapture_1250",          "topmostSubform[0].Page2[0].f2_15[0]"],
];

export const form4797Pdf: PdfFormDescriptor = {
  pendingKey: "form4797",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4797.pdf",
  PDF_FIELD_MAP,
};
