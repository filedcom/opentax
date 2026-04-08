import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4972 (2025) AcroForm field names.
// Part II — capital gain portion: line 6.
// Part II — death benefit exclusion: line 9b.
// Part II — lump-sum total taxable amount: line 10.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "capital_gain_amount", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "death_benefit_exclusion", pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
  { kind: "text", domainKey: "lump_sum_amount", pdfField: "topmostSubform[0].Page1[0].f1_08[0]" },
];

export const form4972Pdf: PdfFormDescriptor = {
  pendingKey: "form4972",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4972.pdf",
  fields,
};
