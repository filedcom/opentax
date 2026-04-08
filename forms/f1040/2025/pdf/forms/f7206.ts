import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "se_net_profit", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "health_insurance_premiums", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "ltc_premiums", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "taxpayer_age", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "ltc_premiums_spouse", pdfField: "topmostSubform[0].Page1[0].f1_8[0]" },
  { kind: "text", domainKey: "spouse_age", pdfField: "topmostSubform[0].Page1[0].f1_9[0]" },
  { kind: "text", domainKey: "premium_tax_credit", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
];

export const form7206Pdf: PdfFormDescriptor = {
  pendingKey: "form7206",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f7206.pdf",
  fields,
};
