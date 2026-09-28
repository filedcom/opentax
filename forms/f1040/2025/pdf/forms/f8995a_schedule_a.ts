import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateOneSstb8995ALines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";

const page = "topmostSubform[0].Page1[0].";
const partI = `${page}Table_PartI[0].`;
const row = (line: number, field: number): string =>
  `${partI}Row${line}[0].f1_${field}[0]`;
const ratioRow = (line: number, field: number): string =>
  `${partI}Row${line}[0].Ln${line}[0].f1_${field}[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "business_name", pdfField: `${partI}Row1a[0].f1_3[0]` },
  { kind: "text", domainKey: "business_ein", pdfField: `${partI}Row1b[0].f1_6[0]` },
  { kind: "text", domainKey: "line2", pdfField: row(2, 9) },
  { kind: "text", domainKey: "line3", pdfField: row(3, 12) },
  { kind: "text", domainKey: "line4", pdfField: row(4, 15) },
  { kind: "text", domainKey: "line5", pdfField: ratioRow(5, 18) },
  { kind: "text", domainKey: "line6", pdfField: ratioRow(6, 22) },
  { kind: "text", domainKey: "line7", pdfField: ratioRow(7, 26) },
  { kind: "text", domainKey: "line8", pdfField: ratioRow(8, 30) },
  { kind: "text", domainKey: "line9", pdfField: ratioRow(9, 34) },
  { kind: "text", domainKey: "line10", pdfField: ratioRow(10, 38) },
  { kind: "text", domainKey: "line11", pdfField: row(11, 42) },
  { kind: "text", domainKey: "line12", pdfField: row(12, 45) },
  { kind: "text", domainKey: "line13", pdfField: row(13, 48) },
];

export function projectOneSstbScheduleA(
  raw: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (Object.keys(raw).length === 0) return {};
  const input = inputSchema.strict().parse(raw);
  const parent = inputSchema.strict().safeParse(allPending.form8995a);
  if (!parent.success || JSON.stringify(parent.data) !== JSON.stringify(input)) {
    throw new Error("Form 8995-A Schedule A PDF needs matching parent pending source");
  }
  if (allPending.form8995 !== undefined || allPending.form8995a_schedule_d !== undefined) {
    throw new Error("Form 8995-A Schedule A PDF cannot accompany Form 8995 or Schedule D");
  }
  const lines = calculateOneSstb8995ALines(input);
  if (allPending.f1040?.line13_qbi_deduction !== lines.line39) {
    throw new Error("Form 8995-A Schedule A PDF parent line 39 differs from Form 1040 line 13");
  }
  return {
    business_name: lines.source.business_name,
    business_ein: lines.source.ein,
    line2: lines.source.business_qbi,
    line3: lines.source.business_w2_wages,
    line4: lines.source.business_ubia,
    line5: lines.line33,
    line6: 197_300,
    line7: lines.line33 - 197_300,
    line8: 50_000,
    line9: lines.phaseIn * 100,
    line10: lines.applicable * 100,
    line11: lines.line2,
    line12: lines.line4,
    line13: lines.line7,
  };
}

export const form8995aScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "form8995a_schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995aa--2025.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_2[0]` },
  ],
  fields,
  projectFields: projectOneSstbScheduleA,
};
