import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { assertScheduleCLossSources } from "../../mef/forms/f8995a.ts";
import { projectOneBusiness8995A } from "./f8995a.ts";

const page = "topmostSubform[0].Page1[0].";
const row = (index: number, field: number): string =>
  `${page}Table_Line1[0].Row${index}[0].f1_${
    String(field).padStart(2, "0")
  }[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...([1, 2] as const).flatMap((index): PdfFieldEntry[] => {
    const start = index === 1 ? 3 : 7;
    return [
      {
        kind: "text",
        domainKey: `row${index}_name`,
        pdfField: row(index, start),
      },
      {
        kind: "text",
        domainKey: `row${index}_a`,
        pdfField: row(index, start + 1),
      },
      {
        kind: "text",
        domainKey: `row${index}_b`,
        pdfField: row(index, start + 2),
      },
      {
        kind: "text",
        domainKey: `row${index}_c`,
        pdfField: row(index, start + 3),
      },
    ];
  }),
  ...([2, 3, 4, 5, 6] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}`,
    pdfField: `${page}f1_${String(line + 13).padStart(2, "0")}[0]`,
  })),
];

export const form8995aScheduleCPdf: PdfFormDescriptor = {
  pendingKey: "form8995a_schedule_c",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ac--2022.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const input = inputSchema.strict().parse(raw);
    const parent = inputSchema.strict().safeParse(allPending.form8995a);
    if (
      !parent.success || JSON.stringify(parent.data) !== JSON.stringify(input)
    ) {
      throw new Error(
        "Form 8995-A Schedule C PDF needs matching parent pending source",
      );
    }
    assertScheduleCLossSources(input, allPending);
    const parentProjection = projectOneBusiness8995A(
      allPending.form8995a,
      allPending,
    );
    const lines = calculateScheduleCLossLines(input);
    if (
      parentProjection.line39 !== lines.parent.line39 ||
      allPending.f1040?.line13_qbi_deduction !== lines.parent.line39
    ) {
      throw new Error(
        "Form 8995-A Schedule C PDF differs from Form 8995-A and Form 1040",
      );
    }
    const first = lines.schedule.rows[0];
    const second = lines.schedule.rows[1];
    return {
      row1_name: first.name,
      row1_a: first.line1a,
      row1_b: first.line1b,
      row1_c: first.line1c,
      row2_name: second.name,
      row2_a: second.line1a,
      row2_b: second.line1b,
      row2_c: second.line1c,
      line2: lines.schedule.line2,
      line3: lines.schedule.line3,
      line4: lines.schedule.line4,
      line5: lines.schedule.line5,
      line6: lines.schedule.line6,
    };
  },
};
