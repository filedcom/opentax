import {
  type F4255Row,
  inputSchema,
} from "../../../nodes/inputs/f4255/index.ts";
import { reconcileForm4255Schedule2 } from "../../mef/forms/f4255.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// December 2025 Form 4255, Part I. The bounded EP-only route fills one
// Form 3468 Part IV row and/or one Form 8933 row. Part II and III remain blank.
const root = "topmostSubform[0].";
const text = (key: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField,
  printZero: true,
});
const part1Columns = ["a", "b", "c", "d", "e", "f"] as const;
const part2Columns = ["n1", "n3"] as const;
const part3Columns = ["q", "s", "t"] as const;

function rowFields(
  row: "1d" | "2a" | "3",
  start1: number,
  start2: number,
  start3: number,
): PdfFieldEntry[] {
  const key = (column: string) => `${row}_${column}`;
  const first = `Page1[0].Table_Part1_ColA-I[0].Row${row}[0].`;
  const second = `Page2[0].Table_Part1_ColJ-N3[0].Row${row}[0].`;
  const third = `Page3[0].Table_Part1_ColO1-T[0].Row${row}[0].`;
  return [
    ...part1Columns.map((column, index) =>
      text(key(column), `${root}${first}f1_${start1 + index}[0]`)
    ),
    text(key(part2Columns[0]), `${root}${second}f2_${start2 + 6}[0]`),
    text(key(part2Columns[1]), `${root}${second}f2_${start2 + 8}[0]`),
    text(key(part3Columns[0]), `${root}${third}f3_${start3 + 6}[0]`),
    text(key(part3Columns[1]), `${root}${third}f3_${start3 + 8}[0]`),
    text(key(part3Columns[2]), `${root}${third}f3_${start3 + 9}[0]`),
  ];
}

function values(row: F4255Row): Record<string, number> {
  const n1 = row.excessive_payment_net_epe;
  const n3 = row.excessive_payment_20_percent;
  return {
    a: row.prior_credit_claimed,
    b: row.gross_epe,
    c: row.gross_epe_applied_regular_tax,
    d: row.gross_epe - row.gross_epe_applied_regular_tax,
    e: row.non_epe_applied_regular_tax,
    f: row.prior_credit_claimed - row.gross_epe -
      row.non_epe_applied_regular_tax,
    n1,
    n3,
    q: n1 + n3,
    s: n1,
    t: n3,
  };
}

export const form4255Pdf: PdfFormDescriptor = {
  pendingKey: "f4255",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4255--2025.pdf",
  pageIndices: () => [0, 1, 2],
  fields: [
    text("filer_name", `${root}Page1[0].f1_01[0]`),
    text("filer_tin", `${root}Page1[0].f1_02[0]`),
    ...rowFields("1d", 30, 28, 31),
    ...rowFields("2a", 147, 145, 161),
    ...rowFields("3", 174, 172, 191),
  ],
  instances(raw, filer, allPending) {
    if (!("rows" in raw)) return [];
    const input = inputSchema.parse(raw);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 4255 PDF needs final filer name and SSN");
    }
    if (!allPending) {
      throw new Error("Form 4255 PDF needs the finalized return");
    }
    reconcileForm4255Schedule2(input, allPending);
    const creditLines = new Set(input.rows.map((row) => row.credit_line));
    if (
      creditLines.size !== input.rows.length ||
      input.rows.some((row) =>
        row.recaptured_total !== 0 || row.recaptured_carryover !== 0 ||
        row.recaptured_non_epe_applied !== 0 ||
        row.recaptured_gross_epe_applied !== 0 ||
        row.recaptured_net_epe !== 0 ||
        row.excessive_payment_net_epe === 0
      )
    ) {
      throw new Error(
        "Form 4255 PDF needs one EP-only row per credit line without recapture",
      );
    }
    const fields: Record<string, unknown> = {
      filer_name: filer.nameLine1,
      filer_tin: filer.primarySSN.replace(/\D/g, ""),
    };
    const totals: Record<string, number> = {};
    for (const row of input.rows) {
      for (const [column, amount] of Object.entries(values(row))) {
        fields[`${row.credit_line}_${column}`] = amount;
        totals[column] = (totals[column] ?? 0) + amount;
      }
    }
    for (const [column, amount] of Object.entries(totals)) {
      fields[`3_${column}`] = amount;
    }
    return [fields];
  },
};
