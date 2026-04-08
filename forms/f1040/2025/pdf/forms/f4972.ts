import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4972 (2025) AcroForm field names.
// Part II — capital gain portion: line 6.
// Part II — death benefit exclusion: line 9b.
// Part II — lump-sum total taxable amount: line 10.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["capital_gain_amount",     "topmostSubform[0].Page1[0].f1_04[0]"],
  ["death_benefit_exclusion", "topmostSubform[0].Page1[0].f1_07[0]"],
  ["lump_sum_amount",         "topmostSubform[0].Page1[0].f1_08[0]"],
];

export const form4972Pdf: PdfFormDescriptor = {
  pendingKey: "form4972",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4972.pdf",
  PDF_FIELD_MAP,
};
