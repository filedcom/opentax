import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";

function row(
  section: "PartI" | "PartII",
  label: string,
  firstField: number,
  prefix: string,
): PdfFieldEntry[] {
  const keys = ["proceeds", "cost", "adjustment", "gain"];
  return keys.map((key, index) => ({
    kind: "text" as const,
    domainKey: `${prefix}_${key}`,
    pdfField: `${page1}Table_${section}[0].Row${label}[0].f1_${
      firstField + index
    }[0]`,
  }));
}

const textFields: readonly (readonly [string, string])[] = [
  ["filer_name", `${page1}f1_1[0]`],
  ["filer_ssn", `${page1}f1_2[0]`],
  ["line_4_other_st", `${page1}f1_19[0]`],
  ["line_5_k1_st", `${page1}f1_20[0]`],
  ["line_6_carryover", `${page1}f1_21[0]`],
  ["print_line7_st_total", `${page1}f1_22[0]`],
  ["line_11_form2439", `${page1}f1_39[0]`],
  ["line_12_k1_lt", `${page1}f1_40[0]`],
  ["print_line13_cap_gain_distrib", `${page1}f1_41[0]`],
  ["line_14_carryover", `${page1}f1_42[0]`],
  ["print_line15_lt_total", `${page1}f1_43[0]`],
  ["print_line16_combined", `${page2}f2_1[0]`],
  ["print_line18_28pct", `${page2}f2_2[0]`],
  ["print_line19_unrecaptured_1250", `${page2}f2_3[0]`],
  ["print_line21_loss", `${page2}f2_4[0]`],
];

function answer(
  domainKey: string,
  prefix: string,
): PdfFieldEntry[] {
  return (["true", "false"] as const).map((whenValue, index) => ({
    kind: "checkboxWhen" as const,
    domainKey,
    pdfField: `${prefix}[${index}]`,
    whenValue,
  }));
}

/** Every printed field in the pinned 2026 draft, including Form 8949 totals. */
export const irsScheduleDPdf2026: PdfFormDescriptor = {
  pendingKey: "schedule_d",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sd--dft.pdf",
  pageIndices: () => [1, 2],
  fields: [
    ...textFields.map(([domainKey, pdfField]) => ({
      kind: "text" as const,
      domainKey,
      pdfField,
    })),
    ...row("PartI", "1a", 3, "print_line1a"),
    ...row("PartI", "1b", 7, "print_line1b"),
    ...row("PartI", "2", 11, "print_line2"),
    ...row("PartI", "3", 15, "print_line3"),
    ...row("PartII", "8a", 23, "print_line8a"),
    ...row("PartII", "8b", 27, "print_line8b"),
    ...row("PartII", "9", 31, "print_line9"),
    ...row("PartII", "10", 35, "print_line10"),
    ...answer("print_qof_disposition", `${page1}c1_1`),
    ...answer("print_line17_both_gains", `${page2}c2_1`),
    ...answer("print_line20_qdcgt", `${page2}c2_2`),
    ...answer("print_line22_qualified_dividends", `${page2}c2_3`),
  ],
};
