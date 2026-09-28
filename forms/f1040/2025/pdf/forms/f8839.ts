import type { PdfFormDescriptor } from "../form-descriptor.ts";

export const form8839Pdf: PdfFormDescriptor = {
  pendingKey: "form8839",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8839--2025.pdf",
  fields: [],
  projectFields(fields) {
    if (Object.keys(fields).length > 0) {
      throw new Error(
        "Form 8839 PDF filing needs source-verified adoption facts and finalized-return reconciliation",
      );
    }
    return fields;
  },
};
