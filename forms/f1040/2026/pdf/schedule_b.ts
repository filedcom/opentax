import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irsScheduleBPdf2026 } from "./forms/schedule_b.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040sb.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "aa6272f6b3b8a8c6a2aa6ef9d1069f1edb88fb9df4df60278d198da89cdfd93f";

const rowSchema = z.object({
  payerName: z.string().trim().min(1),
  amount: z.number().finite(),
});
const detailSchema = z.object({
  payerName: z.string().trim().min(1),
  gross: z.number().finite().nonnegative(),
  adjustments: z.array(z.object({
    label: z.string().trim().min(1),
    amount: z.number().finite().positive(),
  })),
  net: z.number().finite(),
  sellerFinanced: z.boolean(),
  buyerSsn: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerCityStateZip: z.string().optional(),
});
const printSchema = z.object({
  file_schedule_b: z.literal(true),
  interest_rows: z.array(rowSchema),
  interest_details: z.array(detailSchema),
  dividend_rows: z.array(rowSchema),
  print_line2_total: z.number().finite().nonnegative(),
  ee_bond_exclusion: z.number().finite().nonnegative(),
  print_line4_total: z.number().finite().nonnegative(),
  print_line6_total: z.number().finite().nonnegative(),
  foreign_account: z.boolean().optional(),
  fbar_required: z.boolean().optional(),
  foreign_countries: z.array(z.string().trim().min(1)).optional(),
  foreign_trust: z.boolean().optional(),
});

type Print = z.infer<typeof printSchema>;
type Row = z.infer<typeof rowSchema>;
type Filer = { name: string; ssn: string };

function sum(rows: readonly Row[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function validate(rawFields: Record<string, unknown>, filer: Filer): Print {
  const fields = printSchema.parse(rawFields);
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule B PDF needs filer name and SSN");
  }
  const expectedRows = fields.interest_details.flatMap((detail) => [
    { payerName: detail.payerName, amount: detail.gross },
    ...detail.adjustments.map((adjustment) => ({
      payerName: adjustment.label,
      amount: -adjustment.amount,
    })),
  ]);
  if (
    expectedRows.length !== fields.interest_rows.length ||
    expectedRows.some((row, index) =>
      row.payerName !== fields.interest_rows[index].payerName ||
      row.amount !== fields.interest_rows[index].amount
    ) ||
    sum(fields.interest_rows) !== fields.print_line2_total ||
    fields.print_line2_total - fields.ee_bond_exclusion !==
      fields.print_line4_total ||
    sum(fields.dividend_rows) !== fields.print_line6_total
  ) {
    throw new Error("TY2026 Schedule B PDF rows and lines do not reconcile");
  }
  for (const detail of fields.interest_details) {
    if (
      detail.net !== detail.gross -
          detail.adjustments.reduce(
            (total, adjustment) => total + adjustment.amount,
            0,
          ) ||
      (detail.sellerFinanced &&
        (!detail.buyerSsn?.trim() || !detail.buyerAddress?.trim()))
    ) {
      throw new Error("TY2026 Schedule B PDF payer detail is incomplete");
    }
  }
  const partIIIRequired = fields.print_line4_total > 1_500 ||
    fields.print_line6_total > 1_500 || fields.foreign_account === true ||
    fields.foreign_trust === true;
  if (
    partIIIRequired &&
    (fields.foreign_account === undefined ||
      fields.foreign_trust === undefined)
  ) {
    throw new Error("TY2026 Schedule B PDF needs Part III answers");
  }
  if (fields.foreign_account === true && fields.fbar_required === undefined) {
    throw new Error("TY2026 Schedule B PDF needs the FBAR answer");
  }
  if (fields.fbar_required === true && fields.foreign_account !== true) {
    throw new Error(
      "TY2026 Schedule B PDF FBAR answer needs a foreign account",
    );
  }
  if (
    fields.fbar_required === true &&
    (fields.foreign_countries?.length ?? 0) === 0
  ) {
    throw new Error("TY2026 Schedule B PDF needs foreign countries");
  }
  if (
    fields.fbar_required !== true &&
    (fields.foreign_countries?.length ?? 0) > 0
  ) {
    throw new Error("TY2026 Schedule B PDF countries require FBAR filing");
  }
  return fields;
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (entry.kind === "text") {
    if (typeof value === "number" && Math.round(value) === 0) return;
    form.getTextField(entry.pdfField).setText(
      typeof value === "number" ? String(Math.round(value)) : String(value),
    );
  } else if (entry.kind === "checkboxWhen") {
    if (String(value) === entry.whenValue) {
      form.getCheckBox(entry.pdfField).check();
    }
  }
}

function drawTextFit(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  x: number,
  y: number,
  width: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): void {
  const initialSize = 9;
  const measured = font.widthOfTextAtSize(text, initialSize);
  const size = measured > width ? initialSize * width / measured : initialSize;
  if (size < 6) {
    throw new Error("TY2026 Schedule B statement text exceeds its column");
  }
  page.drawText(text, { x, y, size, font });
}

async function appendTable(
  document: PDFDocument,
  filer: Filer,
  title: string,
  rows: readonly Row[],
  printedCount: number,
  total: number,
): Promise<void> {
  if (rows.length <= printedCount) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const remaining = rows.slice(printedCount);
  const perPage = 29;
  const pages = Math.ceil(remaining.length / perPage);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const page = document.addPage([612, 792]);
    page.drawText(`Schedule B (Form 1040) 2026 - ${title}`, {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    drawTextFit(page, `Name: ${filer.name}`, 36, 728, 480, regular);
    page.drawText(`SSN: ${filer.ssn}`, {
      x: 36,
      y: 711,
      size: 9,
      font: regular,
    });
    page.drawText("Payer / Adjustment", {
      x: 36,
      y: 677,
      size: 9,
      font: bold,
    });
    page.drawText("Amount", { x: 510, y: 677, size: 9, font: bold });
    page.drawLine({
      start: { x: 36, y: 668 },
      end: { x: 576, y: 668 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    const slice = remaining.slice(
      pageIndex * perPage,
      (pageIndex + 1) * perPage,
    );
    for (const [index, row] of slice.entries()) {
      const y = 650 - index * 19;
      drawTextFit(page, row.payerName, 36, y, 456, regular);
      page.drawText(String(Math.round(row.amount)), {
        x: 510,
        y,
        size: 9,
        font: regular,
      });
    }
    page.drawText(`Total on Schedule B: ${Math.round(total)}`, {
      x: 36,
      y: 72,
      size: 9,
      font: bold,
    });
    page.drawText(`Continuation page ${pageIndex + 1} of ${pages}`, {
      x: 420,
      y: 72,
      size: 8,
      font: regular,
    });
  }
}

async function appendDetails(
  document: PDFDocument,
  filer: Filer,
  title: string,
  lines: readonly string[],
): Promise<void> {
  if (lines.length === 0) return;
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const perPage = 28;
  const pages = Math.ceil(lines.length / perPage);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const page = document.addPage([612, 792]);
    page.drawText(`Schedule B (Form 1040) 2026 - ${title}`, {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    drawTextFit(page, `Name: ${filer.name}`, 36, 728, 480, regular);
    page.drawText(`SSN: ${filer.ssn}`, {
      x: 36,
      y: 711,
      size: 9,
      font: regular,
    });
    const slice = lines.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
    for (const [index, line] of slice.entries()) {
      drawTextFit(page, line, 36, 675 - index * 21, 540, regular);
    }
    page.drawText(`Continuation page ${pageIndex + 1} of ${pages}`, {
      x: 420,
      y: 72,
      size: 8,
      font: regular,
    });
  }
}

/** Fill the pinned draft Schedule B and retain only its printed page. */
export async function buildScheduleBPdfBytes2026(
  rawFields: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  const fields = validate(rawFields, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule B hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const printValues: Record<string, unknown> = {
    ...fields,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
    print_country_1: fields.foreign_countries?.[0],
    print_country_2: fields.foreign_countries?.[1],
  };
  for (const [index, row] of fields.interest_rows.slice(0, 14).entries()) {
    printValues[`print_int_payer_${index + 1}`] = row.payerName;
    printValues[`print_int_amount_${index + 1}`] = row.amount;
  }
  for (const [index, row] of fields.dividend_rows.slice(0, 15).entries()) {
    printValues[`print_div_payer_${index + 1}`] = row.payerName;
    printValues[`print_div_amount_${index + 1}`] = row.amount;
  }
  for (const entry of irsScheduleBPdf2026.fields) {
    fillField(form, entry, printValues[entry.domainKey]);
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();

  const document = await PDFDocument.create();
  const [printedPage] = await document.copyPages(draft, [1]);
  document.addPage(printedPage);
  await appendTable(
    document,
    filer,
    "Part I Line 1 Continued",
    fields.interest_rows,
    14,
    fields.print_line2_total,
  );
  await appendTable(
    document,
    filer,
    "Part II Line 5 Continued",
    fields.dividend_rows,
    15,
    fields.print_line6_total,
  );
  const sellerLines = fields.interest_details.filter((detail) =>
    detail.sellerFinanced
  ).flatMap((detail) => [
    `Buyer: ${detail.payerName}; interest: ${Math.round(detail.gross)}`,
    `Buyer SSN: ${detail.buyerSsn}; address: ${detail.buyerAddress}`,
    ...(detail.buyerCityStateZip
      ? [`City, state, ZIP: ${detail.buyerCityStateZip}`]
      : []),
  ]);
  await appendDetails(
    document,
    filer,
    "Seller-Financed Mortgages",
    sellerLines,
  );
  await appendDetails(
    document,
    filer,
    "Line 7b Countries Continued",
    (fields.foreign_countries ?? []).slice(2),
  );
  return document.save();
}
