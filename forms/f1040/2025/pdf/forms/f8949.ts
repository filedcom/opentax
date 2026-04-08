import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8949 (2025) AcroForm field names.
// Sales and Other Dispositions of Capital Assets.
// Uses transaction array — no direct AcroForm field mapping.
// PDF filling is handled via transaction-level rendering, not field map.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export const form8949Pdf: PdfFormDescriptor = {
  pendingKey: "form8949",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8949.pdf",
  PDF_FIELD_MAP,
};
