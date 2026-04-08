import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["received_fmv",               "topmostSubform[0].Page1[0].f1_10[0]"],
  ["relinquished_basis",         "topmostSubform[0].Page1[0].f1_11[0]"],
  ["cash_received",              "topmostSubform[0].Page1[0].f1_13[0]"],
  ["other_property_fmv",         "topmostSubform[0].Page1[0].f1_14[0]"],
  ["liabilities_assumed_by_buyer","topmostSubform[0].Page1[0].f1_15[0]"],
  ["liabilities_taxpayer_assumed","topmostSubform[0].Page1[0].f1_16[0]"],
  ["gain_realized",              "topmostSubform[0].Page1[0].f1_17[0]"],
  ["gain_recognized",            "topmostSubform[0].Page1[0].f1_18[0]"],
  ["deferred_gain",              "topmostSubform[0].Page1[0].f1_19[0]"],
  ["basis_replacement",          "topmostSubform[0].Page1[0].f1_23[0]"],
];

export const form8824Pdf: PdfFormDescriptor = {
  pendingKey: "form8824",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8824.pdf",
  PDF_FIELD_MAP,
};
