import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateRentedHomeForm8829,
  type Form8829Lines,
  rentedHomeSourceSchema,
} from "../../../nodes/intermediate/forms/form_8829/index.ts";

// IRS Form 8829 (2025) AcroForm field names.
// Expenses for Business Use of Your Home.
// Field positions checked against the 2025 AcroForm and printed line numbers.
// Part I - Part of your home used for business.
// Part II - Figure your allowable deduction.
// Part III - Depreciation of your home.
// Part IV - Carryover of unallowed expenses.
// Bounded rented-home route: line 1-3, 7-8, 15, 18b-28, 32-36, and 43-44.
const page = "topmostSubform[0].Page1[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "line1",
    pdfField: "topmostSubform[0].Page1[0].f1_03[0]",
  },
  {
    kind: "text",
    domainKey: "line2",
    pdfField: "topmostSubform[0].Page1[0].f1_04[0]",
  },
  { kind: "text", domainKey: "pdf_line3_pct", pdfField: `${page}.f1_05[0]` },
  { kind: "text", domainKey: "pdf_line7_pct", pdfField: `${page}.f1_09[0]` },
  {
    kind: "text",
    domainKey: "line8",
    pdfField: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "pdf_line15",
    pdfField: `${page}.f1_21[0]`,
  },
  {
    kind: "text",
    domainKey: "line18b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line18[0].f1_27[0]",
  },
  {
    kind: "text",
    domainKey: "line19b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line19[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "line20b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line20[0].f1_31[0]",
  },
  {
    kind: "text",
    domainKey: "line21b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line21[0].f1_33[0]",
  },
  {
    kind: "text",
    domainKey: "line22b",
    pdfField:
      "topmostSubform[0].Page1[0].Table_Lines16-23[0].Line22[0].f1_35[0]",
  },
  {
    kind: "text",
    domainKey: "line25",
    pdfField: "topmostSubform[0].Page1[0].f1_39[0]",
  },
  {
    kind: "text",
    domainKey: "line23b",
    pdfField: `${page}.Table_Lines16-23[0].Line23[0].f1_37[0]`,
  },
  ...([
    ["line24", 38],
    ["line26", 40],
    ["line27", 41],
    ["line28", 42],
    ["line32", 46],
    ["line33", 47],
    ["line34", 48],
    ["line35", 49],
    ["line36", 50],
    ["line43", 57],
    ["line44", 58],
  ] as const).map(([domainKey, number]) => ({
    kind: "text" as const,
    domainKey,
    pdfField: `${page}.f1_${number}[0]`,
    printZero: domainKey === "line43" || domainKey === "line44",
  })),
];

function percent(value: number): string {
  return Number((value * 100).toFixed(2)).toString();
}

function projectFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.keys(fields).length === 0) return fields;
  const source = rentedHomeSourceSchema.parse(fields.rented_home);
  const lines = calculateRentedHomeForm8829(source);
  for (const key of Object.keys(lines) as (keyof Form8829Lines)[]) {
    if (fields[key] !== lines[key]) {
      throw new Error(`Form 8829 PDF ${key} differs from source calculation`);
    }
  }
  return {
    ...fields,
    pdf_line3_pct: percent(lines.line3),
    pdf_line7_pct: percent(lines.line7),
    pdf_line15: lines.line8 <= 0 ? "-0-" : lines.line8,
  };
}

export const form8829Pdf: PdfFormDescriptor = {
  pendingKey: "form_8829",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8829--2025.pdf",
  includeWhen: (source) => typeof source.line36 === "number",
  projectFields,
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: `${page}.f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}.f1_02[0]` },
  ],
};
