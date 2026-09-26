import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// TY2025 AcroForm order: f1_01/f1_02 are taxpayer name and identifying
// number; the numbered form lines start at f1_03.
const page = "topmostSubform[0].Page1[0].";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1", pdfField: `${page}f1_03[0]` },
  { kind: "text", domainKey: "line2", pdfField: `${page}f1_04[0]` },
  { kind: "text", domainKey: "line3", pdfField: `${page}f1_05[0]` },
  {
    kind: "text",
    domainKey: "line4a",
    pdfField: `${page}Line4a_ReadOrder[0].f1_06[0]`,
  },
  { kind: "text", domainKey: "line4b", pdfField: `${page}f1_07[0]` },
  { kind: "text", domainKey: "line4c", pdfField: `${page}f1_08[0]` },
  { kind: "text", domainKey: "line4d", pdfField: `${page}f1_09[0]` },
  { kind: "text", domainKey: "line4e", pdfField: `${page}f1_10[0]` },
  { kind: "text", domainKey: "line4f", pdfField: `${page}f1_11[0]` },
  { kind: "text", domainKey: "line4g", pdfField: `${page}f1_12[0]` },
  { kind: "text", domainKey: "line4h", pdfField: `${page}f1_13[0]` },
  { kind: "text", domainKey: "line5", pdfField: `${page}f1_14[0]` },
  { kind: "text", domainKey: "line6", pdfField: `${page}f1_15[0]` },
  { kind: "text", domainKey: "line7", pdfField: `${page}f1_16[0]` },
  { kind: "text", domainKey: "line8", pdfField: `${page}f1_17[0]` },
];

export const form4952Pdf: PdfFormDescriptor = {
  pendingKey: "form4952",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4952--2025.pdf",
  fields,
};
