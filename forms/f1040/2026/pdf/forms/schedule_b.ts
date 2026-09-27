import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const page = "topmostSubform[0].Page1[0].";

function interestRow(index: number): PdfFieldEntry[] {
  const name = index === 1
    ? `${page}Line1_ReadOrder[0].f1_03[0]`
    : `${page}f1_${String(index * 2 + 1).padStart(2, "0")}[0]`;
  return [
    { kind: "text", domainKey: `print_int_payer_${index}`, pdfField: name },
    {
      kind: "text",
      domainKey: `print_int_amount_${index}`,
      pdfField: `${page}f1_${String(index * 2 + 2).padStart(2, "0")}[0]`,
    },
  ];
}

function dividendRow(index: number): PdfFieldEntry[] {
  const name = index === 1
    ? `${page}ReadOrderControl[0].f1_34[0]`
    : `${page}f1_${32 + index * 2}[0]`;
  return [
    { kind: "text", domainKey: `print_div_payer_${index}`, pdfField: name },
    {
      kind: "text",
      domainKey: `print_div_amount_${index}`,
      pdfField: `${page}f1_${33 + index * 2}[0]`,
    },
  ];
}

const textFields: readonly (readonly [string, string])[] = [
  ["filer_name", `${page}f1_01[0]`],
  ["filer_ssn", `${page}f1_02[0]`],
  ["print_line2_total", `${page}f1_31[0]`],
  ["ee_bond_exclusion", `${page}f1_32[0]`],
  ["print_line4_total", `${page}f1_33[0]`],
  ["print_line6_total", `${page}f1_64[0]`],
  ["print_country_1", `${page}f1_65[0]`],
  ["print_country_2", `${page}f1_66[0]`],
];

export const irsScheduleBPdf2026: PdfFormDescriptor = {
  pendingKey: "schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sb--dft.pdf",
  pageIndices: () => [1],
  includeWhen: (fields) => fields.file_schedule_b === true,
  fields: [
    ...textFields.map(([domainKey, pdfField]) => ({
      kind: "text" as const,
      domainKey,
      pdfField,
    })),
    ...Array.from({ length: 14 }, (_, index) => interestRow(index + 1)).flat(),
    ...Array.from({ length: 15 }, (_, index) => dividendRow(index + 1)).flat(),
    ...(["true", "false"] as const).flatMap((whenValue, index) => [
      {
        kind: "checkboxWhen" as const,
        domainKey: "foreign_account",
        pdfField: `${page}TagcorrectingSubform[0].c1_1[${index}]`,
        whenValue,
      },
      {
        kind: "checkboxWhen" as const,
        domainKey: "fbar_required",
        pdfField: `${page}c1_2[${index}]`,
        whenValue,
      },
      {
        kind: "checkboxWhen" as const,
        domainKey: "foreign_trust",
        pdfField: `${page}c1_3[${index}]`,
        whenValue,
      },
    ]),
  ],
};
