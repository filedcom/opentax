import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8995-A (2025) AcroForm field names.
// Qualified Business Income Deduction.
// Name/SSN header fields skipped.
// taxable_income        → line 1  (taxable income before QBI deduction)
// net_capital_gain      → line 2  (net capital gain)
// qbi                   → line 3  (QBI component)
// w2_wages              → line 4  (W-2 wages)
// unadjusted_basis      → line 5  (unadjusted basis of qualified property)
// sstb_qbi              → line 6  (SSTB QBI)
// sstb_w2_wages         → line 7  (SSTB W-2 wages)
// sstb_unadjusted_basis → line 8  (SSTB unadjusted basis)
// line6_sec199a_dividends → line 6 (Section 199A dividends)
// qbi_loss_carryforward → line 16 (QBI loss carryforward)
// reit_loss_carryforward → line 17 (REIT/PTP loss carryforward)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "taxable_income", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowA[0].f1_03[0]" },
  { kind: "text", domainKey: "net_capital_gain", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowA[0].f1_04[0]" },
  { kind: "text", domainKey: "qbi", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowB[0].f1_05[0]" },
  { kind: "text", domainKey: "w2_wages", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowB[0].f1_06[0]" },
  { kind: "text", domainKey: "unadjusted_basis", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowC[0].f1_07[0]" },
  { kind: "text", domainKey: "sstb_qbi", pdfField: "topmostSubform[0].Page1[0].Table_PartI[0].RowC[0].f1_08[0]" },
  { kind: "text", domainKey: "sstb_w2_wages", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row2[0].f1_09[0]" },
  { kind: "text", domainKey: "sstb_unadjusted_basis", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row2[0].f1_10[0]" },
  { kind: "text", domainKey: "line6_sec199a_dividends", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row2[0].f1_11[0]" },
  { kind: "text", domainKey: "qbi_loss_carryforward", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row3[0].f1_14[0]" },
  { kind: "text", domainKey: "reit_loss_carryforward", pdfField: "topmostSubform[0].Page1[0].Table_PartII[0].Row4[0].f1_15[0]" },
];

export const form8995aPdf: PdfFormDescriptor = {
  pendingKey: "form8995a",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  fields,
};
