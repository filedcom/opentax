import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const page = "topmostSubform[0].Page1[0].";
const amounts: readonly (readonly [string, number])[] = [
  ["line1_taxable_interest", 3],
  ["line2_ordinary_dividends", 4],
  ["line3_annuities", 5],
  ["line4a_passive_income", 6],
  ["line4b_rental_net", 7],
  ["line4c_combined", 8],
  ["line5a_net_gain", 9],
  ["line5b_net_gain_adjustment", 10],
  ["line5d_combined", 12],
  ["line7_other_modifications", 14],
  ["line8_total_investment_income", 15],
  ["line9a_investment_interest_expense", 16],
  ["line9b_state_local_tax", 17],
  ["line9d_total_expenses", 19],
  ["line10_additional_modifications", 20],
  ["line11_total_deductions", 21],
  ["line12_net_investment_income", 22],
  ["line13_magi", 23],
  ["line14_threshold", 24],
  ["line15_magi_excess", 25],
  ["line16_taxable_base", 26],
  ["line17_niit", 27],
];

export const irsForm8960Pdf2026: PdfFormDescriptor = {
  pendingKey: "form8960",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f8960--dft.pdf",
  pageIndices: () => [1],
  includeWhen: (fields) =>
    typeof fields.line17_niit === "number" && fields.line17_niit > 0,
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${page}f1_1[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${page}f1_2[0]` },
    ...amounts.map(([domainKey, number]): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField: `${page}f1_${number}[0]`,
    })),
  ],
};
