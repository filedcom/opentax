import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8880 (2025) AcroForm field names.
// Credit for Qualified Retirement Savings Contributions (Saver's Credit).
// Verified against the f8880--2025.pdf AcroForm field dump:
//   f1_1 = name, f1_2 = SSN
//   Table_Ln1-6 rows (column (a) taxpayer / (b) spouse):
//     BodyRow1 f1_3/f1_4  = line 1 IRA/ABLE contributions
//     BodyRow2 f1_5/f1_6  = line 2 elective deferrals
//     BodyRow3 f1_7/f1_8  = line 3 add lines 1 and 2
//     BodyRow4 f1_9/f1_10 = line 4 distributions
//     BodyRow5 f1_11/f1_12 = line 5 subtract line 4 from line 3
//     BodyRow6 f1_13/f1_14 = line 6 smaller of line 5 or $2,000
//   f1_15 = line 7, f1_16 = line 8 AGI, f1_17 = line 9 decimal rate,
//   f1_18 = line 10, f1_19 = line 11 tax-liability limit, f1_20 = line 12 credit
//
// print_* keys are self-emitted by the form8880 node — and only when the
// computed credit is nonzero, so ineligible returns (AGI above the phase-out)
// no longer produce a stray all-zero Form 8880 page. The previous descriptor
// mapped raw pending inputs one row off (elective deferrals printed on line 3).

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "print_line1a_ira", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow1[0].f1_3[0]" },
  { kind: "text", domainKey: "print_line1b_ira", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow1[0].f1_4[0]" },
  { kind: "text", domainKey: "print_line2a_deferrals", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow2[0].f1_5[0]" },
  { kind: "text", domainKey: "print_line2b_deferrals", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow2[0].f1_6[0]" },
  { kind: "text", domainKey: "print_line3a_total", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow3[0].f1_7[0]" },
  { kind: "text", domainKey: "print_line3b_total", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow3[0].f1_8[0]" },
  { kind: "text", domainKey: "print_line4a_distributions", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow4[0].f1_9[0]", printZero: true },
  { kind: "text", domainKey: "print_line4b_distributions", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow4[0].f1_10[0]" },
  { kind: "text", domainKey: "print_line5a", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow5[0].f1_11[0]" },
  { kind: "text", domainKey: "print_line5b", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow5[0].f1_12[0]" },
  { kind: "text", domainKey: "print_line6a_eligible", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow6[0].f1_13[0]" },
  { kind: "text", domainKey: "print_line6b_eligible", pdfField: "topmostSubform[0].Page1[0].Table_Ln1-6[0].BodyRow6[0].f1_14[0]" },
  { kind: "text", domainKey: "print_line7_total_eligible", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "print_line8_agi", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "print_line9_rate", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "print_line10_raw_credit", pdfField: "topmostSubform[0].Page1[0].f1_18[0]" },
  { kind: "text", domainKey: "print_line11_tax_liability", pdfField: "topmostSubform[0].Page1[0].f1_19[0]" },
  { kind: "text", domainKey: "print_line12_credit", pdfField: "topmostSubform[0].Page1[0].f1_20[0]" },
];

export const form8880Pdf: PdfFormDescriptor = {
  pendingKey: "form8880",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8880--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  ],
  includeWhen: (fields) =>
    ((fields["print_line12_credit"] as number | undefined) ?? 0) > 0,
};
