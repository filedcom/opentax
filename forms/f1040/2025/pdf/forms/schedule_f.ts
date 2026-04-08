import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule F (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sf.pdf
//
// Part I Farm Income – Cash Method:
//   f1_01–f1_NN: personal info / EIN (skip)
//   f1_07 = Line 8 crop insurance proceeds
//   f1_08 = Line 8 other farm income

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "crop_insurance", pdfField: "topmostSubform[0].Page1[0].f1_7[0]" },
  { kind: "text", domainKey: "line8_other_income", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
];

export const scheduleFPdf: PdfFormDescriptor = {
  pendingKey: "schedule_f",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sf.pdf",
  fields,
};
