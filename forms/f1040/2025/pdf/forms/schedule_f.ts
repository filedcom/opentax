import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule F (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sf.pdf
//
// Part I Farm Income – Cash Method:
//   f1_01–f1_NN: personal info / EIN (skip)
//   f1_07 = Line 8 crop insurance proceeds
//   f1_08 = Line 8 other farm income

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["crop_insurance",      "topmostSubform[0].Page1[0].f1_07[0]"],
  ["line8_other_income",  "topmostSubform[0].Page1[0].f1_08[0]"],
];

export const scheduleFPdf: PdfFormDescriptor = {
  pendingKey: "schedule_f",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sf.pdf",
  PDF_FIELD_MAP,
};
