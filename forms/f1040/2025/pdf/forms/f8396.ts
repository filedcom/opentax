import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8396 (2025) AcroForm field names.
// Mortgage Interest Credit.
// Name/SSN/MCC issuer fields skipped.
// mortgage_interest_paid         → line 1 (interest paid on certified mortgage)
// mcc_rate                       → line 2 (credit rate shown on MCC)
// prior_year_credit_carryforward → line 8 (credit carryforward from prior year)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "mortgage_interest_paid", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "mcc_rate", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "prior_year_credit_carryforward", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
];

export const form8396Pdf: PdfFormDescriptor = {
  pendingKey: "form8396",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8396.pdf",
  fields,
};
