import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Bounded field positions from the 2025 AcroForm. Complete calculated-line
// filling and a rendered visual check remain open.
const page = "topmostSubform[0].Page1[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1", pdfField: `${page}.f1_4[0]` },
  { kind: "text", domainKey: "line2", pdfField: `${page}.f1_5[0]` },
  { kind: "text", domainKey: "line6", pdfField: `${page}.f1_9[0]` },
];

export const form8990Pdf: PdfFormDescriptor = {
  pendingKey: "form8990",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8990--2025.pdf",
  includeWhen: (source) => typeof source.line30 === "number",
  fields,
};
