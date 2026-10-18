import { StandardFonts } from "pdf-lib";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import {
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  assertScheduleCLossFiler,
  assertScheduleCLossSources,
} from "../../../../mef/forms/deductions/business/f8995a/f8995a.ts";
import { projectOneBusiness8995A } from "./f8995a.ts";
import { mefTaxYear } from "../../../../mef/support/year-config.ts";

const page = "topmostSubform[0].Page1[0].";
const row = (index: number, field: number): string =>
  `${page}Table_Line1[0].Row${index}[0].f1_${
    String(field).padStart(2, "0")
  }[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...([1, 2, 3] as const).flatMap((index): PdfFieldEntry[] => {
    const start = 3 + (index - 1) * 4;
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
        printZero: true,
      },
    ];
  }),
  ...([2, 3, 4, 5, 6] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}`,
    pdfField: `${page}f1_${String(line + 13).padStart(2, "0")}[0]`,
    printZero: line === 6,
  })),
];

function projectLossScheduleCopies(
  raw: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown>[] {
  if (Object.keys(raw).length === 0) return [];
  const input = inputSchema.strict().parse(raw);
  const parent = inputSchema.strict().safeParse(allPending.form8995a);
  if (
    !parent.success || JSON.stringify(parent.data) !== JSON.stringify(input)
  ) {
    throw new Error(
      "Form 8995-A Schedule C PDF needs matching parent pending source",
    );
  }
  if (allPending.form8995a_schedule_b !== undefined) {
    throw new Error(
      "Form 8995-A Schedule C PDF cannot accompany Schedule B aggregation",
    );
  }
  assertScheduleCLossSources(input, allPending, mefTaxYear());
  const parentProjection = projectOneBusiness8995A(
    allPending.form8995a,
    allPending,
  );
  const lines = calculateScheduleCLossLines(input, mefTaxYear());
  if (
    parentProjection.line39 !== lines.parent.line39 ||
    allPending.f1040?.line13_qbi_deduction !== lines.parent.line39
  ) {
    throw new Error(
      "Form 8995-A Schedule C PDF differs from Form 8995-A and Form 1040",
    );
  }
  const rows = lines.schedule.rows;
  const copies: Record<string, unknown>[] = [];
  for (let start = 0; start < rows.length; start += 3) {
    copies.push({
      ...Object.fromEntries(
        rows.slice(start, start + 3).flatMap((row, index) => [
          [`row${index + 1}_name`, row.name],
          [`row${index + 1}_a`, row.line1a],
          [`row${index + 1}_b`, row.line1b],
          [`row${index + 1}_c`, row.line1c],
        ]),
      ),
      ...(start === 0
        ? {
          line2: lines.schedule.line2,
          line3: lines.schedule.line3,
          line4: lines.schedule.line4,
          line5: lines.schedule.line5,
          line6: lines.schedule.line6,
        }
        : {}),
      qbi_loss_page_note: rows.length > 3
        ? `Form 8995-A Schedule C rows ${start + 1}-${
          Math.min(start + 3, rows.length)
        } of ${rows.length}; totals on first schedule`
        : undefined,
    });
  }
  return copies;
}

export const form8995aScheduleCPdf: PdfFormDescriptor = {
  pendingKey: "form8995a_schedule_c",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995ac--2022.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page}f1_02[0]` },
  ],
  fields,
  projectFields(raw, allPending) {
    return projectLossScheduleCopies(raw, allPending)[0] ?? {};
  },
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    if (!allPending) {
      throw new Error(
        "Form 8995-A loss schedule copies need retained return sources",
      );
    }
    assertScheduleCLossFiler(
      inputSchema.parse(allPending.form8995a_schedule_c),
      allPending,
      filer,
      mefTaxYear(),
    );
    return projectLossScheduleCopies(
      allPending.form8995a_schedule_c,
      allPending,
    );
  },
  async decoratePages(document, pages, instance) {
    if (typeof instance.qbi_loss_page_note !== "string") return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    pages[0].drawText(instance.qbi_loss_page_note, {
      x: 40,
      y: 9,
      size: 8,
      font,
    });
  },
};
