import type { PdfFormDescriptor } from "../form-descriptor.ts";

export const form461Pdf: PdfFormDescriptor = {
  pendingKey: "form461",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f461--2025.pdf",
  // No verified line-to-AcroForm mapping. The former domainKey was removed by
  // the line-level Form 461 model, and f1_1 has not been verified as line 16.
  // Keep PDF coverage explicitly open until the filled-page inspection batch.
  fields: [],
};
