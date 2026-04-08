import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4684 (2025) AcroForm field names.
// Section A (personal use property) — lines 1–17.
// Section B (business/income-producing property) — lines 19–33.
// Name/description fields are skipped; only numeric amount fields mapped.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // Section A — personal
  ["personal_fmv_before",  "topmostSubform[0].Page1[0].f1_04[0]"],
  ["personal_fmv_after",   "topmostSubform[0].Page1[0].f1_05[0]"],
  ["personal_basis",       "topmostSubform[0].Page1[0].f1_06[0]"],
  ["personal_insurance",   "topmostSubform[0].Page1[0].f1_09[0]"],
  ["agi",                  "topmostSubform[0].Page1[0].f1_14[0]"],
  // Section B — business
  ["business_fmv_before",  "topmostSubform[0].Page1[0].f1_21[0]"],
  ["business_fmv_after",   "topmostSubform[0].Page1[0].f1_22[0]"],
  ["business_basis",       "topmostSubform[0].Page1[0].f1_23[0]"],
  ["business_insurance",   "topmostSubform[0].Page1[0].f1_26[0]"],
];

export const form4684Pdf: PdfFormDescriptor = {
  pendingKey: "form4684",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4684.pdf",
  PDF_FIELD_MAP,
};
