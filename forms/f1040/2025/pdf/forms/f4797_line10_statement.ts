import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  type Box11Line10Source,
  box11Line10SourceSchema,
} from "../../../nodes/inputs/k1_partnership/box11_line10.ts";

const LEFT = 36;
const RIGHT = 576;
const HEADER_Y = 674;
const BODY_TOP = 645;
const BODY_BOTTOM = 90;
const TEXT_SIZE = 8;
const COL = [36, 76, 250, 504, 576] as const;

interface PrintedRow {
  readonly source: Box11Line10Source;
  readonly index: number;
  readonly name: string[];
  readonly evidence: string[];
  readonly height: number;
}

function wrap(text: string, font: PDFFont, width: number): string[] {
  font.encodeText(text);
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (font.widthOfTextAtSize(word, TEXT_SIZE) > width) {
      throw new Error(
        "Form 4797 line 10 statement has an unprintable source word",
      );
    }
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, TEXT_SIZE) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function printedRows(
  rows: readonly Box11Line10Source[],
  font: PDFFont,
): PrintedRow[] {
  return rows.map((source, offset) => {
    const name = [
      ...wrap(source.partnership_name, font, COL[2] - COL[1] - 8),
      source.partnership_ein,
    ];
    const evidence = [
      ...wrap(
        `K-1: ${source.source_document_reference}`,
        font,
        COL[3] - COL[2] - 8,
      ),
      ...wrap(
        `Statement: ${source.statement_reference}`,
        font,
        COL[3] - COL[2] - 8,
      ),
      ...wrap(
        `Review: ${source.character_workpaper_reference}`,
        font,
        COL[3] - COL[2] - 8,
      ),
      `Recipient TIN: ${source.recipient_tin}`,
    ];
    const height = Math.max(
      43,
      Math.max(name.length, evidence.length) * 10 + 10,
    );
    if (height > BODY_TOP - BODY_BOTTOM) {
      throw new Error("Form 4797 line 10 source exceeds one statement page");
    }
    return { source, index: offset + 4, name, evidence, height };
  });
}

export async function appendForm4797Line10Statement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (fields.pdf_line10_overflow_rows === undefined) return;
  const rows = z.array(box11Line10SourceSchema).min(2).parse(
    fields.pdf_line10_overflow_rows,
  );
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 4797 line 10 statement needs filer identity");
  }
  const subtotal = rows.reduce((sum, row) => sum + row.gain_loss, 0);
  if (
    fields.pdf_k1_line10_4_description !== "See attached" ||
    fields.pdf_k1_line10_4_gain !== subtotal ||
    fields.pdf_line17 !==
      Number(fields.pdf_sale_gain) +
        Number(fields.pdf_k1_line10_2_gain) +
        Number(fields.pdf_k1_line10_3_gain) + subtotal ||
    fields.ordinary_gain !== fields.pdf_line17
  ) {
    throw new Error(
      "Form 4797 line 10 statement does not reconcile to the form",
    );
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const laidOut = printedRows(rows, font);
  const pages: PrintedRow[][] = [];
  let current: PrintedRow[] = [];
  let used = 0;
  for (const row of laidOut) {
    if (used + row.height > BODY_TOP - BODY_BOTTOM) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(row);
    used += row.height;
  }
  if (current.length > 0) pages.push(current);
  pages.forEach((batch, pageIndex) => {
    const page = document.addPage([612, 792]);
    page.drawText(
      "2025 Form 4797, Part II, line 10 - K-1 ordinary gain or loss (continued)",
      {
        x: LEFT,
        y: 748,
        size: 11,
        font: bold,
      },
    );
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: LEFT,
      y: 729,
      size: 9,
      font,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: LEFT,
      y: 714,
      size: 9,
      font,
    });
    const labels = [
      "#",
      "Partnership / EIN",
      "K-1 source, statement and review",
      "Gain/(loss)",
    ];
    labels.forEach((label, index) =>
      page.drawText(label, {
        x: COL[index] + 4,
        y: HEADER_Y,
        size: 8,
        font: bold,
      })
    );
    let y = BODY_TOP;
    const bottom = BODY_TOP - batch.reduce((sum, row) => sum + row.height, 0);
    for (const x of COL) {
      page.drawLine({
        start: { x, y: 689 },
        end: { x, y: bottom },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    page.drawLine({
      start: { x: LEFT, y: 689 },
      end: { x: RIGHT, y: 689 },
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: LEFT, y },
      end: { x: RIGHT, y },
      thickness: 0.5,
    });
    for (const row of batch) {
      const start = y - 12;
      page.drawText(String(row.index), {
        x: COL[0] + 4,
        y: start,
        size: TEXT_SIZE,
        font,
      });
      page.drawText(row.source.code, {
        x: COL[0] + 4,
        y: start - 11,
        size: TEXT_SIZE,
        font,
      });
      row.name.forEach((line, index) =>
        page.drawText(line, {
          x: COL[1] + 4,
          y: start - index * 10,
          size: TEXT_SIZE,
          font,
        })
      );
      row.evidence.forEach((line, index) =>
        page.drawText(line, {
          x: COL[2] + 4,
          y: start - index * 10,
          size: TEXT_SIZE,
          font,
        })
      );
      const amount = row.source.gain_loss.toLocaleString("en-US");
      const amountWidth = font.widthOfTextAtSize(amount, TEXT_SIZE);
      if (amountWidth > COL[4] - COL[3] - 8) {
        throw new Error("Form 4797 line 10 statement amount is too wide");
      }
      page.drawText(amount, {
        x: COL[4] - 4 - amountWidth,
        y: start,
        size: TEXT_SIZE,
        font,
      });
      y -= row.height;
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT, y },
        thickness: 0.5,
      });
    }
    page.drawText(
      `Attached rows 4-${rows.length + 3}: ${
        subtotal.toLocaleString("en-US")
      } (Form 4797 line 10, row 4)`,
      { x: LEFT, y: 66, size: 8, font },
    );
    page.drawText(
      `Form 4797 lines 17/18b: ${
        Number(fields.pdf_line17).toLocaleString("en-US")
      }`,
      { x: LEFT, y: 53, size: 8, font },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pages.length}`, {
      x: 510,
      y: 53,
      size: 8,
      font,
    });
  });
}
