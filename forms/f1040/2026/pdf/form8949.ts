import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import {
  Form8949Part,
  transactionSchema,
} from "../../nodes/intermediate/forms/form8949/index.ts";
import { isDirectScheduleDTransaction } from "../../nodes/intermediate/aggregation/schedule_d/index.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f8949.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "891d869c87ffe9c6d7f79079d19ebf4ac0afa7257f6374cd95936e44a7079ffe";

type Transaction = z.infer<typeof transactionSchema>;
type Filer = { name: string; ssn: string };

const shortParts = [
  Form8949Part.A,
  Form8949Part.B,
  Form8949Part.C,
  Form8949Part.G,
  Form8949Part.H,
  Form8949Part.I,
] as const;
const longParts = [
  Form8949Part.D,
  Form8949Part.E,
  Form8949Part.F,
  Form8949Part.J,
  Form8949Part.K,
  Form8949Part.L,
] as const;
const orderedParts: readonly Form8949Part[] = [...shortParts, ...longParts];

/** Validate graph transaction detail before grouping printed pages. */
export function form8949Transactions(
  fields: Record<string, unknown>,
): Transaction[] {
  const input = fields.transaction;
  if (input === undefined) return [];
  const values = Array.isArray(input) ? input : [input];
  return values.map((value) => {
    const transaction = transactionSchema.parse(value);
    if (
      transaction.is_long_term !== longParts.includes(
          transaction.part as (typeof longParts)[number],
        ) ||
      transaction.gain_loss !== transaction.proceeds -
          transaction.cost_basis + (transaction.adjustment_amount ?? 0) ||
      ((transaction.adjustment_amount ?? 0) !== 0 &&
        !transaction.adjustment_codes) ||
      transaction.collectibles === true ||
      (transaction.adjustment_codes !== undefined &&
        !/^[BEW]+$/.test(transaction.adjustment_codes))
    ) {
      throw new Error("TY2026 Form 8949 transaction detail does not reconcile");
    }
    return transaction;
  });
}

export function filedForm8949Transactions(
  fields: Record<string, unknown>,
): Transaction[] {
  return form8949Transactions(fields).filter((transaction) =>
    !isDirectScheduleDTransaction(transaction)
  );
}

function dateForForm(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

function setText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === "") return;
  const field = form.getTextField(name);
  field.setText(String(value));
  field.setFontSize(8);
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function fillPage(
  form: ReturnType<PDFDocument["getForm"]>,
  part: Form8949Part,
  rows: readonly Transaction[],
  filer: Filer,
): number {
  const isLong = longParts.includes(part as (typeof longParts)[number]);
  const page = isLong ? "Page2[0]" : "Page1[0]";
  const prefix = isLong ? "f2_" : "f1_";
  const button = isLong ? "c2_1" : "c1_1";
  const table = isLong ? "Table_Line1_Part2" : "Table_Line1_Part1";
  const base = `topmostSubform[0].${page}.`;
  const checkboxIndex = (isLong ? longParts : shortParts).indexOf(
    part as never,
  );
  form.getCheckBox(`${base}${button}[${checkboxIndex}]`).check();
  setText(form, `${base}${prefix}01[0]`, filer.name);
  setText(form, `${base}${prefix}02[0]`, filer.ssn);

  const totals = { proceeds: 0, basis: 0, adjustment: 0, gain: 0 };
  for (const [rowIndex, transaction] of rows.entries()) {
    const fieldBase = 3 + rowIndex * 8;
    const rowBase = `${base}${table}[0].Row${rowIndex + 1}[0].`;
    const field = (column: number) =>
      `${rowBase}${prefix}${String(fieldBase + column).padStart(2, "0")}[0]`;
    setText(form, field(0), transaction.description);
    setText(form, field(1), dateForForm(transaction.date_acquired));
    setText(form, field(2), dateForForm(transaction.date_sold));
    setText(form, field(3), transaction.proceeds);
    setText(form, field(4), transaction.cost_basis);
    setText(form, field(5), transaction.adjustment_codes);
    if (transaction.adjustment_codes) {
      setText(form, field(6), transaction.adjustment_amount ?? 0);
    }
    setText(form, field(7), transaction.gain_loss);
    totals.proceeds += transaction.proceeds;
    totals.basis += transaction.cost_basis;
    totals.adjustment += transaction.adjustment_amount ?? 0;
    totals.gain += transaction.gain_loss;
  }
  setText(form, `${base}${prefix}91[0]`, totals.proceeds);
  setText(form, `${base}${prefix}92[0]`, totals.basis);
  if (totals.adjustment !== 0) {
    setText(form, `${base}${prefix}94[0]`, totals.adjustment);
  }
  setText(form, `${base}${prefix}95[0]`, totals.gain);
  return isLong ? 2 : 1;
}

/** Fill each required Form 8949 category and continuation page. */
export async function buildForm8949PdfBytes2026(
  fields: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Form 8949 PDF needs filer name and SSN");
  }
  const transactions = filedForm8949Transactions(fields);
  if (transactions.length === 0) {
    throw new Error("TY2026 Form 8949 PDF has no filed transactions");
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 8949 hash changed");
  }
  const document = await PDFDocument.create();
  for (const part of orderedParts) {
    const entries = transactions.filter((transaction) =>
      transaction.part === part
    );
    for (const rows of chunks(entries, 11)) {
      const draft = await PDFDocument.load(source, { ignoreEncryption: true });
      const form = draft.getForm();
      const pageIndex = fillPage(form, part, rows, filer);
      const font = await draft.embedFont(StandardFonts.Helvetica);
      form.updateFieldAppearances(font);
      form.flatten();
      const [page] = await document.copyPages(draft, [pageIndex]);
      document.addPage(page);
    }
  }
  return document.save();
}
