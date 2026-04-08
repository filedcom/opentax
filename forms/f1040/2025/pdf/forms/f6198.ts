import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 6198 (2025) AcroForm field names.
// Part I  — current-year income from activity: line 1.
// Part I  — prior year unallowed losses: line 2.
// Part II — amount at risk at end of year: line 19 (or line 10).
// Activity name/description fields skipped.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["current_year_income", "topmostSubform[0].Page1[0].f1_03[0]"],
  ["schedule_c_loss",     "topmostSubform[0].Page1[0].f1_04[0]"],
  ["schedule_f_loss",     "topmostSubform[0].Page1[0].f1_05[0]"],
  ["prior_unallowed",     "topmostSubform[0].Page1[0].f1_06[0]"],
  ["amount_at_risk",      "topmostSubform[0].Page1[0].f1_15[0]"],
];

export const form6198Pdf: PdfFormDescriptor = {
  pendingKey: "form6198",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6198.pdf",
  PDF_FIELD_MAP,
};
