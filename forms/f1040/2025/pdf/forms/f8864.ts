import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8864DirectProducer } from "../../form8864_source.ts";

// Field IDs inspected in the official December 2025 one-page AcroForm.
const page = "topmostSubform[0].Page1[0].";
const table = `${page}Table_Lines1-7[0].`;
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: field,
});

/** Staged direct-producer PDF projection, absent from public registry. */
export const form8864Pdf: PdfFormDescriptor = {
  pendingKey: "f8864",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8864.pdf",
  pageIndices: () => [0],
  fields: [
    text("line7_gallons", `${table}Line7[0].f1_22[0]`),
    text("line7_rate", `${table}Line7[0].f1_23[0]`),
    text("line7", `${table}Line7[0].f1_24[0]`),
    text("line8_gallons", `${table}Line8[0].f1_25[0]`),
    text("line8_rate", `${table}Line8[0].f1_26[0]`),
    text("line8", `${table}Line8[0].f1_27[0]`),
    text("line9", `${page}f1_28[0]`),
    text("line10", `${page}f1_29[0]`),
    text("line11", `${page}f1_30[0]`),
  ],
  filerFields: [
    text("nameLine1", `${page}f1_1[0]`),
    text("primarySSN", `${page}f1_2[0]`),
  ],
  projectFields(raw, allPending) {
    const { lines } = reconcileForm8864DirectProducer(raw, allPending);
    return {
      line7_gallons: lines.line7_gallons || undefined,
      line7_rate: lines.line7_gallons ? "0.10" : undefined,
      line7: lines.line7 || undefined,
      line8_gallons: lines.line8_gallons || undefined,
      line8_rate: lines.line8_gallons ? "0.20" : undefined,
      line8: lines.line8 || undefined,
      line9: lines.line9,
      line10: undefined,
      line11: lines.line11,
    };
  },
};
