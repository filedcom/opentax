import type { PdfFormDescriptor } from "../../../pdf/form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";

const page1: readonly (readonly [string, string])[] = [
  ["filer_name", "f1_1[0]"],
  ["filer_ssn", "f1_2[0]"],
  ["line1", "f1_3[0]"],
  ["line2a", "f1_4[0]"],
  ["line2b", "f1_5[0]"],
  ["line2c", "f1_6[0]"],
  ["line2d", "f1_7[0]"],
  ["line3", "f1_8[0]"],
  ["line4", "f1_9[0]"],
  ["line5", "f1_10[0]"],
  ["line6", "Line6ReadOrder[0].f1_11[0]"],
  ["line7", "f1_12[0]"],
  ["line8", "f1_13[0]"],
  ["line9", "f1_14[0]"],
  ["line10", "f1_15[0]"],
  ["line11", "f1_16[0]"],
  ["line12", "f1_17[0]"],
  ["line13", "f1_18[0]"],
  ["line14", "f1_19[0]"],
];

const page2: readonly (readonly [string, string])[] = [
  ["line16a", "f2_2[0]"],
  ["line4", "f2_3[0]"],
  ["line16b", "f2_4[0]"],
  ["line17", "f2_5[0]"],
  ["line18a", "f2_6[0]"],
  ["line18b", "f2_7[0]"],
  ["line19", "f2_8[0]"],
  ["line20", "f2_9[0]"],
  ["part_iib_line21", "f2_10[0]"],
  ["part_iib_line22", "f2_11[0]"],
  ["part_iib_line23", "f2_12[0]"],
  ["part_iib_line24", "f2_13[0]"],
  ["part_iib_line25", "f2_14[0]"],
  ["part_iib_line26", "f2_15[0]"],
  ["line27", "f2_16[0]"],
];

export const irsSchedule8812Pdf2026: PdfFormDescriptor = {
  pendingKey: "f8812",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s8--dft.pdf",
  pageIndices: () => [0, 1],
  fields: [
    ...page1.map(([domainKey, pdfField]) => ({
      kind: "text" as const,
      domainKey,
      pdfField: `${p1}${pdfField}`,
      printZero: ["line10", "line14"].includes(domainKey),
    })),
    ...page2.map(([domainKey, pdfField]) => ({
      kind: "text" as const,
      domainKey,
      pdfField: `${p2}${pdfField}`,
      printZero: domainKey === "line27",
    })),
  ],
};
