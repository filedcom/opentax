import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 6198 (2025) AcroForm field names.
// Part I  — current-year income from activity: line 1.
// Part I  — prior year unallowed losses: line 2.
// Part II — amount at risk at end of year: line 19 (or line 10).
// Activity name/description fields skipped.
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "current_year_income", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "schedule_c_loss", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "schedule_f_loss", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "prior_unallowed", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "amount_at_risk", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
];

export const form6198Pdf: PdfFormDescriptor = {
  pendingKey: "form6198",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6198.pdf",
  fields,
};
