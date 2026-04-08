import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "excess_business_loss", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
];

export const form461Pdf: PdfFormDescriptor = {
  pendingKey: "form461",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f461.pdf",
  fields,
};
