import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8396 (2025) AcroForm field names.
// Mortgage Interest Credit.
// Name/SSN/MCC issuer fields skipped.
// mortgage_interest_paid         → line 1 (interest paid on certified mortgage)
// mcc_rate                       → line 2 (credit rate shown on MCC)
// prior_year_credit_carryforward → line 8 (credit carryforward from prior year)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["mortgage_interest_paid",         "topmostSubform[0].Page1[0].f1_04[0]"],
  ["mcc_rate",                       "topmostSubform[0].Page1[0].f1_05[0]"],
  ["prior_year_credit_carryforward", "topmostSubform[0].Page1[0].f1_11[0]"],
];

export const form8396Pdf: PdfFormDescriptor = {
  pendingKey: "form8396",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8396.pdf",
  PDF_FIELD_MAP,
};
