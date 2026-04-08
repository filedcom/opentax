import type { PdfFormDescriptor } from "../form-descriptor.ts";

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["excess_business_loss", "topmostSubform[0].Page1[0].f1_27[0]"],
];

export const form461Pdf: PdfFormDescriptor = {
  pendingKey: "form461",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f461.pdf",
  PDF_FIELD_MAP,
};
