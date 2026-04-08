import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8815 (2025) AcroForm field names.
// Exclusion of Interest From Series EE and I U.S. Savings Bonds Issued After 1989.
// Name/SSN header fields skipped.
// ee_bond_interest     → line 1  (total EE/I bond interest)
// bond_proceeds        → line 2  (total bond proceeds)
// qualified_expenses   → line 3  (qualified higher education expenses)
// modified_agi         → line 9  (modified adjusted gross income)
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["ee_bond_interest",   "topmostSubform[0].Page1[0].f1_03[0]"],
  ["bond_proceeds",      "topmostSubform[0].Page1[0].f1_04[0]"],
  ["qualified_expenses", "topmostSubform[0].Page1[0].f1_05[0]"],
  ["modified_agi",       "topmostSubform[0].Page1[0].f1_11[0]"],
];

export const form8815Pdf: PdfFormDescriptor = {
  pendingKey: "form8815",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8815.pdf",
  PDF_FIELD_MAP,
};
