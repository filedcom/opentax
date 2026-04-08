import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8995 (2025) AcroForm field names.
// Qualified Business Income Deduction — Simplified Computation.
// Name/SSN header fields skipped.
// Internal tracking fields (qbi_from_schedule_c, qbi_from_schedule_f) have no PDF fields.
// qbi                   → line 15 (total qualified business income)
// taxable_income        → line 11 (taxable income before deduction)
// net_capital_gain      → line 12 (net capital gain)
// qbi_loss_carryforward → line 16 (QBI loss carryforward to next year)
// reit_loss_carryforward → line 17 (REIT/PTP loss carryforward to next year)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "taxable_income", pdfField: "topmostSubform[0].Page1[0].Table[0].Row1i[0].f1_05[0]" },
  { kind: "text", domainKey: "net_capital_gain", pdfField: "topmostSubform[0].Page1[0].Table[0].Row1ii[0].f1_06[0]" },
  { kind: "text", domainKey: "qbi", pdfField: "topmostSubform[0].Page1[0].Table[0].Row1iii[0].f1_09[0]" },
  { kind: "text", domainKey: "qbi_loss_carryforward", pdfField: "topmostSubform[0].Page1[0].Table[0].Row1iii[0].f1_10[0]" },
  { kind: "text", domainKey: "reit_loss_carryforward", pdfField: "topmostSubform[0].Page1[0].Table[0].Row1iii[0].f1_11[0]" },
];

export const form8995Pdf: PdfFormDescriptor = {
  pendingKey: "form8995",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995.pdf",
  fields,
};
