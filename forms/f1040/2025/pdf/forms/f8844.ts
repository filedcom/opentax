import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8844DirectEmployer } from "../../mef/forms/f8844_source.ts";

const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
});

export const form8844Pdf: PdfFormDescriptor = {
  pendingKey: "f8844",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8844.pdf",
  fields: [
    text("line1", 3),
    text("line2", 4),
    text("line3", 5),
    text("line4", 6),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8844s) || fields.f8844s.length === 0) return {};
    const { source, lines } = reconcileForm8844DirectEmployer(allPending);
    if (JSON.stringify(fields) !== JSON.stringify(source)) {
      throw new Error("Form 8844 PDF source differs from filed MeF source");
    }
    return { ...fields, ...lines };
  },
  includeWhen(fields) {
    return Array.isArray(fields.f8844s) && fields.f8844s.length > 0;
  },
};
