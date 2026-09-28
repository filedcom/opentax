import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form8995a/index.ts";
import { assertScheduleBAggregationJoin } from "../../mef/forms/f8995a_schedule_b.ts";

const page = "topmostSubform[0].Page1[0].";
const row = (index: number, field: number): string =>
  `${page}Table_Line3[0].Row${index}[0].f1_${
    String(field).padStart(2, "0")
  }[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "aggregation_no", pdfField: `${page}f1_03[0]` },
  ...([1, 2, 3] as const).map((part): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line1_part${part}`,
    pdfField: `${page}f1_0${part + 3}[0]`,
  })),
  ...([1, 2, 3] as const).map((part): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line2_part${part}`,
    pdfField: `${page}f1_0${part + 6}[0]`,
  })),
  ...([1, 2] as const).flatMap((index): PdfFieldEntry[] => {
    const start = index === 1 ? 10 : 15;
    return [
      {
        kind: "text",
        domainKey: `row${index}_name`,
        pdfField: row(index, start),
      },
      {
        kind: "text",
        domainKey: `row${index}_ein`,
        pdfField: row(index, start + 1),
      },
      {
        kind: "text",
        domainKey: `row${index}_qbi`,
        pdfField: row(index, start + 2),
      },
      {
        kind: "text",
        domainKey: `row${index}_wages`,
        pdfField: row(index, start + 3),
      },
      {
        kind: "text",
        domainKey: `row${index}_ubia`,
        pdfField: row(index, start + 4),
      },
    ];
  }),
  { kind: "text", domainKey: "total_qbi", pdfField: `${page}f1_25[0]` },
  { kind: "text", domainKey: "total_wages", pdfField: `${page}f1_26[0]` },
  { kind: "text", domainKey: "total_ubia", pdfField: `${page}f1_27[0]` },
];

function paragraphLines(value: string): readonly string[] {
  const lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    const last = lines.length - 1;
    const next = last >= 0 ? `${lines[last]} ${word}` : word;
    if (next.length <= 60) {
      if (last >= 0) lines[last] = next;
      else lines.push(next);
    } else if (word.length <= 60 && lines.length < 3) {
      lines.push(word);
    } else {
      throw new Error(
        "Form 8995-A Schedule B PDF explanation does not fit the three source fields",
      );
    }
  }
  return lines;
}

export const form8995aScheduleBPdf: PdfFormDescriptor = {
  pendingKey: "form8995a_schedule_b",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ab--2022.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const input = inputSchema.strict().parse(raw);
    const { source, schedule } = assertScheduleBAggregationJoin(input, {
      filer,
      pending: allPending,
    });
    const description = paragraphLines(source.group_description);
    return [{
      aggregation_no: "1",
      line1_part1: description[0],
      line1_part2: description[1],
      line1_part3: description[2],
      row1_name: schedule.rows[0]?.name,
      row1_ein: schedule.rows[0]?.ein,
      row1_qbi: schedule.rows[0]?.qbi,
      row1_wages: schedule.rows[0]?.w2Wages,
      row1_ubia: schedule.rows[0]?.ubia,
      row2_name: schedule.rows[1]?.name,
      row2_ein: schedule.rows[1]?.ein,
      row2_qbi: schedule.rows[1]?.qbi,
      row2_wages: schedule.rows[1]?.w2Wages,
      row2_ubia: schedule.rows[1]?.ubia,
      total_qbi: schedule.totalQbi,
      total_wages: schedule.totalW2Wages,
      total_ubia: schedule.totalUbia,
    }];
  },
};
