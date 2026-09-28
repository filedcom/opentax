import { z } from "zod";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  assertForm4797ExcessGainRow,
  assertForm8949TransactionMath,
  transactionSchema,
} from "../../../nodes/intermediate/forms/form8949/index.ts";
import { form8949 as nativeForm8949 } from "../../mef/forms/f8949.ts";
import { isQofCodeZRow } from "../../mef/forms/f8949.ts";

// The canonical Form 8949 node emits one transaction or an accumulated array.
// Each official 2025 page holds 11 rows for exactly one reporting box.
const PARTS = [
  "A", "B", "C", "G", "H", "I",
  "D", "E", "F", "J", "K", "L",
] as const;
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);
const ROW_COLUMNS = [
  "description",
  "date_acquired",
  "date_sold",
  "proceeds",
  "cost_basis",
  "adjustment_codes",
  "adjustment_amount",
  "gain_loss",
] as const;
const ROWS_PER_PAGE = 11;

type Transaction = z.infer<typeof transactionSchema>;

function sourceRows(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function assertNoSection1202Rows(rows: readonly unknown[]): void {
  if (
    rows.some((row) =>
      typeof row === "object" && row !== null &&
      (("qsbs_code" in row && row.qsbs_code !== undefined) ||
        ("qsbs_amount" in row && row.qsbs_amount !== undefined) ||
        ("adjustment_codes" in row &&
          typeof row.adjustment_codes === "string" &&
          row.adjustment_codes.includes("Q")))
    )
  ) {
    throw new Error(
      "Form 8949 section 1202 PDF needs a sourced exclusion, 28% Rate Gain Worksheet refigure, and Form 6251 line 2h preference before filing",
    );
  }
}

function checkedDate(value: string): string {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? [value.slice(0, 4), value.slice(5, 7), value.slice(8, 10)]
    : /^\d{8}$/.test(value)
    ? [value.slice(4, 8), value.slice(0, 2), value.slice(2, 4)]
    : /^\d{2}\/\d{2}\/\d{4}$/.test(value)
    ? [value.slice(6, 10), value.slice(0, 2), value.slice(3, 5)]
    : undefined;
  if (!match) {
    throw new Error("Form 8949 PDF transaction dates need a supported calendar date");
  }
  const [year, month, day] = match;
  const iso = `${year}-${month}-${day}`;
  const timestamp = Date.parse(`${iso}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== iso
  ) {
    throw new Error("Form 8949 PDF transaction dates need a valid calendar date");
  }
  return `${month}/${day}/${year}`;
}

function printedAmount(value: number): string {
  return value < 0 ? `(${Math.abs(value)})` : String(value);
}

function pageForPart(part: string): 1 | 2 {
  return SHORT_TERM_PARTS.has(part) ? 1 : 2;
}

function checkboxFields(page: 1 | 2): PdfFieldEntry[] {
  const parts = PARTS.filter((part) => pageForPart(part) === page);
  return parts.map((part, index) => ({
    kind: "checkboxWhen" as const,
    domainKey: "pdf_part",
    pdfField: `topmostSubform[0].Page${page}[0].c${page}_1[${index}]`,
    whenValue: part,
  }));
}

function transactionFields(page: 1 | 2): PdfFieldEntry[] {
  return Array.from({ length: ROWS_PER_PAGE }, (_, row) =>
    ROW_COLUMNS.map((column, offset) => ({
      kind: "text" as const,
      domainKey: `pdf_page${page}_row${row + 1}_${column}`,
      pdfField:
        `topmostSubform[0].Page${page}[0].Table_Line1_Part${page}[0].Row${row + 1}[0].f${page}_${
          String(3 + row * ROW_COLUMNS.length + offset).padStart(2, "0")
        }[0]`,
    }))
  ).flat();
}

function totalFields(page: 1 | 2): PdfFieldEntry[] {
  return [
    ["proceeds", 91],
    ["cost_basis", 92],
    ["adjustment_amount", 94],
    ["gain_loss", 95],
  ].map(([column, number]) => ({
    kind: "text" as const,
    domainKey: `pdf_page${page}_total_${column}`,
    pdfField: `topmostSubform[0].Page${page}[0].f${page}_${number}[0]`,
  }));
}

function validateTransactions(rows: readonly unknown[]): Transaction[] {
  return rows.map((row) => {
    const tx = transactionSchema.parse(row);
    assertForm4797ExcessGainRow(tx);
    assertForm8949TransactionMath(tx);
    if (tx.is_long_term !== (pageForPart(tx.part) === 2)) {
      throw new Error(
        `Form 8949 PDF box ${tx.part} conflicts with its holding-period flag`,
      );
    }
    const qofZ = isQofCodeZRow(tx);
    if (!tx.from_form4797_investment_1245) {
      checkedDate(tx.date_acquired);
      if (!qofZ) checkedDate(tx.date_sold);
    }
    return tx;
  });
}

function pageInstance(part: string, transactions: Transaction[]): Record<string, unknown> {
  const page = pageForPart(part);
  const rows = Object.fromEntries(transactions.flatMap((tx, index) => {
    const qofZ = isQofCodeZRow(tx);
    const values = [
      tx.description,
      tx.from_form4797_investment_1245 ? undefined : checkedDate(tx.date_acquired),
      tx.from_form4797_investment_1245 || qofZ ? undefined : checkedDate(tx.date_sold),
      qofZ ? undefined : printedAmount(tx.proceeds),
      tx.from_form4797_investment_1245 || qofZ ? undefined : printedAmount(tx.cost_basis),
      tx.adjustment_codes,
      tx.adjustment_amount === undefined
        ? undefined
        : printedAmount(tx.adjustment_amount),
      printedAmount(tx.gain_loss),
    ];
    return ROW_COLUMNS.map((column, offset) => [
      `pdf_page${page}_row${index + 1}_${column}`,
      values[offset],
    ]);
  }));
  const sum = (select: (tx: Transaction) => number) =>
    transactions.reduce((total, tx) => total + select(tx), 0);
  const hasAdjustment = transactions.some((tx) =>
    tx.adjustment_amount !== undefined
  );
  return {
    pdf_page_index: page - 1,
    pdf_part: part,
    ...rows,
    ...(transactions.every(isQofCodeZRow)
      ? {}
      : { [`pdf_page${page}_total_proceeds`]: printedAmount(sum((tx) => tx.proceeds)) }),
    ...(transactions.every((tx) =>
        tx.from_form4797_investment_1245 || isQofCodeZRow(tx)
      )
      ? {}
      : { [`pdf_page${page}_total_cost_basis`]: printedAmount(sum((tx) => tx.cost_basis)) }),
    ...(hasAdjustment
      ? {
        [`pdf_page${page}_total_adjustment_amount`]: printedAmount(
          sum((tx) => tx.adjustment_amount ?? 0),
        ),
      }
      : {}),
    [`pdf_page${page}_total_gain_loss`]: printedAmount(
      sum((tx) => tx.gain_loss),
    ),
  };
}

export const form8949Pdf: PdfFormDescriptor = {
  pendingKey: "form8949",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8949--2025.pdf",
  projectFields(fields, allPending) {
    if (fields.transactions !== undefined || fields.f8949s !== undefined) {
      throw new Error("Form 8949 PDF needs computed canonical transaction rows");
    }
    const rows = sourceRows(fields.transaction);
    const source = sourceRows(allPending.f8949?.f8949s);
    assertNoSection1202Rows([...rows, ...source]);
    if (rows.length === 0 && source.length > 0) {
      throw new Error("Form 8949 PDF needs computed canonical transaction rows");
    }
    if (rows.length > 0) {
      nativeForm8949.build(rows.map((row) => transactionSchema.parse(row)), {
        pending: allPending,
      });
    }
    return fields;
  },
  instances(fields) {
    if (fields.transactions !== undefined || fields.f8949s !== undefined) {
      throw new Error("Form 8949 PDF needs computed canonical transaction rows");
    }
    const rows = sourceRows(fields.transaction);
    assertNoSection1202Rows(rows);
    const transactions = validateTransactions(rows);
    return PARTS.flatMap((part) => {
      const forPart = transactions.filter((tx) => tx.part === part);
      return Array.from(
        { length: Math.ceil(forPart.length / ROWS_PER_PAGE) },
        (_, chunk) => pageInstance(
          part,
          forPart.slice(
            chunk * ROWS_PER_PAGE,
            (chunk + 1) * ROWS_PER_PAGE,
          ),
        ),
      );
    });
  },
  pageIndices(fields) {
    const page = fields.pdf_page_index;
    if (page !== 0 && page !== 1) {
      throw new Error("Form 8949 PDF instance needs a selected Part I or II page");
    }
    return [page];
  },
  fields: [
    ...checkboxFields(1),
    ...transactionFields(1),
    ...totalFields(1),
    ...checkboxFields(2),
    ...transactionFields(2),
    ...totalFields(2),
  ],
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page2[0].f2_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page2[0].f2_02[0]" },
  ],
};
