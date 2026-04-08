import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4797 (2025) AcroForm field names.
// Part I  — Section 1231 gains: line 9 total.
// Part II — ordinary gains: line 18b total.
// Part III — recapture: 1245 (line 22) and 1250 (line 26c).
// Nonrecaptured 1231 loss from prior years: line 8.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "nonrecaptured_1231_loss", pdfField: "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_7[0]" },
  { kind: "text", domainKey: "section_1231_gain", pdfField: "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_10[0]" },
  { kind: "text", domainKey: "ordinary_gain", pdfField: "topmostSubform[0].Page1[0].TableLine2[0].Row3[0].f1_22[0]" },
  { kind: "text", domainKey: "recapture_1245", pdfField: "topmostSubform[0].Page2[0].PartIIITable1[0].Row3[0].f2_9[0]" },
  { kind: "text", domainKey: "recapture_1250", pdfField: "topmostSubform[0].Page2[0].PartIIITable2[0].Row20[0].f2_15[0]" },
];

export const form4797Pdf: PdfFormDescriptor = {
  pendingKey: "form4797",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4797.pdf",
  fields,
};
