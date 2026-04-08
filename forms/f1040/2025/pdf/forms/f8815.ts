import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8815 (2025) AcroForm field names.
// Exclusion of Interest From Series EE and I U.S. Savings Bonds Issued After 1989.
// Name/SSN header fields skipped.
// ee_bond_interest     → line 1  (total EE/I bond interest)
// bond_proceeds        → line 2  (total bond proceeds)
// qualified_expenses   → line 3  (qualified higher education expenses)
// modified_agi         → line 9  (modified adjusted gross income)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "ee_bond_interest", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row1[0].f1_3[0]" },
  { kind: "text", domainKey: "bond_proceeds", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row1[0].ColB[0].f1_4[0]" },
  { kind: "text", domainKey: "qualified_expenses", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row1[0].ColB[0].f1_5[0]" },
  { kind: "text", domainKey: "modified_agi", pdfField: "topmostSubform[0].Page1[0].Table_Line1[0].Row3[0].ColB[0].f1_11[0]" },
];

export const form8815Pdf: PdfFormDescriptor = {
  pendingKey: "form8815",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8815.pdf",
  fields,
};
