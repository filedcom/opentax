import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8824 (2025) AcroForm field names.
// Like-Kind Exchanges (and section 1043 conflict-of-interest sales).
// Name/SSN/property description fields skipped.
// Part III — Realized gain or (loss), recognized gain, and basis of like-kind property received.
// received_fmv               → line 12 (FMV of like-kind property received)
// relinquished_basis         → line 13 (adjusted basis of relinquished property)
// cash_received              → line 15 (cash and liabilities received)
// other_property_fmv         → line 16 (FMV of other property received)
// liabilities_assumed_by_buyer → line 17 (liabilities assumed by other party)
// liabilities_taxpayer_assumed → line 18 (liabilities taxpayer assumed)
// gain_realized              → line 19 (gain or loss realized)
// gain_recognized            → line 20 (gain recognized)
// deferred_gain              → line 21 (deferred gain or loss)
// basis_replacement          → line 25 (adjusted basis of replacement property)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "received_fmv", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "relinquished_basis", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "cash_received", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "other_property_fmv", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "liabilities_assumed_by_buyer", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
  { kind: "text", domainKey: "liabilities_taxpayer_assumed", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  { kind: "text", domainKey: "gain_realized", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "gain_recognized", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "deferred_gain", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "basis_replacement", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
];

export const form8824Pdf: PdfFormDescriptor = {
  pendingKey: "form8824",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8824.pdf",
  fields,
};
