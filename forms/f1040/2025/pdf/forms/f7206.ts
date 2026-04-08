import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 7206 (2025) AcroForm field names.
// Self-Employed Health Insurance Deduction.
// Name/SSN fields skipped.
// se_net_profit           → line 1  (net profit from self-employment)
// health_insurance_premiums → line 2 (total health insurance premiums paid)
// ltc_premiums            → line 3  (taxpayer LTC insurance premiums)
// taxpayer_age            → line 4  (taxpayer age at end of year)
// ltc_premiums_spouse     → line 5  (spouse LTC insurance premiums)
// spouse_age              → line 6  (spouse age at end of year)
// premium_tax_credit      → line 11 (premium tax credit from Form 8962)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["se_net_profit",            "topmostSubform[0].Page1[0].f1_03[0]"],
  ["health_insurance_premiums","topmostSubform[0].Page1[0].f1_04[0]"],
  ["ltc_premiums",             "topmostSubform[0].Page1[0].f1_05[0]"],
  ["taxpayer_age",             "topmostSubform[0].Page1[0].f1_06[0]"],
  ["ltc_premiums_spouse",      "topmostSubform[0].Page1[0].f1_08[0]"],
  ["spouse_age",               "topmostSubform[0].Page1[0].f1_09[0]"],
  ["premium_tax_credit",       "topmostSubform[0].Page1[0].f1_16[0]"],
];

export const form7206Pdf: PdfFormDescriptor = {
  pendingKey: "form7206",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f7206.pdf",
  PDF_FIELD_MAP,
};
