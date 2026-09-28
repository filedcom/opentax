import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  type Form8997Part,
} from "../../../nodes/inputs/f8997/ledger.ts";
import { reconcileForm8997Pending } from "../../../nodes/inputs/f8997/reconciliation.ts";

// Deliberately not registered in PDF_FORMS. Continuation sheets, Form 8949
// reconciliation, and filled-page visual review are not complete.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";

function field(
  page: string,
  table: string,
  row: number,
  number: number,
): string {
  const prefix = page === page1 ? "f1" : "f2";
  return `${page}${table}[0].Row${row}[0].${prefix}_${
    String(number).padStart(2, "0")
  }[0]`;
}

function rowFields(
  part: number,
  page: string,
  table: string,
  firstField: number,
): PdfFieldEntry[] {
  return [1, 2, 3, 4, 5].flatMap((row) =>
    ["ein", "date", "description", "code", "short", "long"].map(
      (column, offset): PdfFieldEntry => ({
        kind: "text",
        domainKey: `part${part}_row${row}_${column}`,
        pdfField: field(
          page,
          table,
          row,
          firstField + (row - 1) * 6 + offset,
        ),
      }),
    )
  );
}

const fields: readonly PdfFieldEntry[] = [
  ...rowFields(1, page1, "Table_Part1", 3),
  { kind: "text", domainKey: "part1_short_total", pdfField: `${page1}f1_35[0]` },
  { kind: "text", domainKey: "part1_long_total", pdfField: `${page1}f1_36[0]` },
  ...rowFields(2, page1, "Table_Part2", 37),
  { kind: "text", domainKey: "part2_short_total", pdfField: `${page1}f1_69[0]` },
  { kind: "text", domainKey: "part2_long_total", pdfField: `${page1}f1_70[0]` },
  { kind: "checkbox", domainKey: "foreign_yes", pdfField: `${page1}c1_1[0]` },
  { kind: "checkbox", domainKey: "foreign_no", pdfField: `${page1}c1_1[1]` },
  { kind: "checkbox", domainKey: "waiver_yes", pdfField: `${page1}c1_2[0]` },
  { kind: "checkbox", domainKey: "waiver_no", pdfField: `${page1}c1_2[1]` },
  ...rowFields(3, page2, "Table_Part3", 1),
  { kind: "text", domainKey: "part3_short_total", pdfField: `${page2}f2_33[0]` },
  { kind: "text", domainKey: "part3_long_total", pdfField: `${page2}f2_34[0]` },
  { kind: "checkbox", domainKey: "no_1099b", pdfField: `${page2}c2_3[0]` },
  ...rowFields(4, page2, "Table_Part4", 35),
  { kind: "text", domainKey: "part4_short_total", pdfField: `${page2}f2_67[0]` },
  { kind: "text", domainKey: "part4_long_total", pdfField: `${page2}f2_68[0]` },
];

function printableDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

function partValues(partNumber: number, part: Form8997Part): Record<string, unknown> {
  if (part.rows.length > 5) {
    throw new Error(
      "Form 8997 PDF needs a labeled continuation sheet for more than five rows in a part",
    );
  }
  const rows = part.rows.flatMap((row, index) => {
    if (row.description.length > 100) {
      throw new Error("Form 8997 PDF description exceeds the sourced one-line field");
    }
    const key = `part${partNumber}_row${index + 1}`;
    return [
      [`${key}_ein`, row.qof_ein],
      [`${key}_date`, printableDate(row.date)],
      [`${key}_description`, row.description],
      [`${key}_code`, row.special_gain_code],
      [`${key}_short`, row.short_term],
      [`${key}_long`, row.long_term],
    ] as const;
  });
  return {
    ...Object.fromEntries(rows),
    [`part${partNumber}_short_total`]: part.totals.short_term,
    [`part${partNumber}_long_total`]: part.totals.long_term,
  };
}

export const stagedForm8997Pdf: PdfFormDescriptor = {
  pendingKey: "f8997",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8997--2025.pdf",
  pageIndices: () => [0, 1],
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page1}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}f1_02[0]` },
  ],
  fields,
  instances(_fields, _filer, allPending) {
    if (!allPending) {
      throw new Error("Form 8997 PDF needs the executor's full pending return");
    }
    const statement = reconcileForm8997Pending(allPending);
    return [{
      ...partValues(1, statement.part_i),
      ...partValues(2, statement.part_ii),
      ...partValues(3, statement.part_iii),
      ...partValues(4, statement.part_iv),
      foreign_yes: statement.foreign_eligible_taxpayer,
      foreign_no: !statement.foreign_eligible_taxpayer,
      waiver_yes: statement.foreign_eligible_taxpayer &&
        statement.treaty_benefits_waived,
      waiver_no: statement.foreign_eligible_taxpayer &&
        !statement.treaty_benefits_waived,
      no_1099b: statement.no_form1099b_for_disposition,
    }];
  },
};
