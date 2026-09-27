import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";

const mainAmounts: readonly (readonly [string, number])[] = [
  ["line1a_deductions_excluding_schedule1a_43", 3],
  ["regular_tax_income", 4],
  ["line2a_taxes_paid", 5],
  ["line2c_investment_interest", 7],
  ["line2f_atnold_print", 10],
  ["private_activity_bond_interest", 11],
  ["qsbs_adjustment", 12],
  ["iso_adjustment", 13],
  ["depreciation_adjustment", 16],
  ["other_adjustments", 25],
  ["amti", 26],
  ["exemption", 27],
  ["taxable_excess", 28],
  ["tentative_tax", 29],
  ["amtftc", 30],
  ["net_tmt", 31],
  ["regular_tax", 32],
  ["line11_amt", 33],
];

export const irsForm6251Pdf2026: PdfFormDescriptor = {
  pendingKey: "form6251",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f6251--dft.pdf",
  pageIndices: () => [1, 2],
  includeWhen: (fields) =>
    (typeof fields.line11_amt === "number" && fields.line11_amt > 0) ||
    fields.must_file_for_credit === true,
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${p1}f1_1[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${p1}f1_2[0]` },
    ...mainAmounts.map(([domainKey, fieldNumber]): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField: `${p1}f1_${fieldNumber}[0]`,
    })),
    ...Array.from({ length: 29 }, (_, index): PdfFieldEntry => ({
      kind: "text",
      domainKey: `line${index + 12}`,
      pdfField: `${p2}f2_${index + 1}[0]`,
    })),
  ],
};
