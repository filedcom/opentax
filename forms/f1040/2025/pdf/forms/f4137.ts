import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4137 (2025) AcroForm field names (34 text fields).
// f1_1–f1_2: name/SSN (skipped).
// f1_3–f1_22: 5-row employer table (skipped — per-employer detail).
// f1_23: line 2 total allocated tips.
// f1_24: line 3 total tips received.
// f1_25: line 4 tips reported to employer.
// f1_27: line 6 SS wages from W-2.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "allocated_tips", pdfField: "topmostSubform[0].Page1[0].f1_23[0]" },
  { kind: "text", domainKey: "total_tips_received", pdfField: "topmostSubform[0].Page1[0].f1_24[0]" },
  { kind: "text", domainKey: "reported_tips", pdfField: "topmostSubform[0].Page1[0].f1_25[0]" },
  { kind: "text", domainKey: "ss_wages_from_w2", pdfField: "topmostSubform[0].Page1[0].f1_27[0]" },
];

export const form4137Pdf: PdfFormDescriptor = {
  pendingKey: "form4137",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4137.pdf",
  fields,
};
