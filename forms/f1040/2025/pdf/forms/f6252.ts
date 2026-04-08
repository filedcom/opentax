import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 6252 (2025) AcroForm field names.
// Part I  — gross profit percentage (lines 1–5).
// Part II — installment sale income (lines 6–26).
// Name/SSN/property description fields skipped.
// selling_price     → line 4  (gross selling price)
// gross_profit      → line 9  (gross profit)
// contract_price    → line 10 (contract price)
// payments_received → line 11 (payments received during year)
// depreciation_recapture → line 13 (ordinary income recapture from Form 4797)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["selling_price",          "topmostSubform[0].Page1[0].f1_05[0]"],
  ["gross_profit",           "topmostSubform[0].Page1[0].f1_11[0]"],
  ["contract_price",         "topmostSubform[0].Page1[0].f1_12[0]"],
  ["payments_received",      "topmostSubform[0].Page1[0].f1_13[0]"],
  ["depreciation_recapture", "topmostSubform[0].Page1[0].f1_21[0]"],
];

export const form6252Pdf: PdfFormDescriptor = {
  pendingKey: "form6252",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6252.pdf",
  PDF_FIELD_MAP,
};
