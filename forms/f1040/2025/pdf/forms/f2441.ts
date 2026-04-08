import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 2441 (2025) AcroForm field names.
// Part III employer-provided dependent care benefits: line 12 approx f1_27–f1_28 range.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "dep_care_benefits", pdfField: "topmostSubform[0].Page1[0].f1_27[0]" },
];

export const form2441Pdf: PdfFormDescriptor = {
  pendingKey: "form2441",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2441.pdf",
  fields,
};
