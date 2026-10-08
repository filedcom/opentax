import { type PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { FilerIdentity } from "../../../../mef/header.ts";
import {
  type K1Section1231Row,
  k1Section1231RowSchema,
} from "../../../../nodes/intermediate/forms/form4797/index.ts";
import { assertK1Section1231FilingLinks } from "../../../../nodes/intermediate/forms/form4797/k1_1231_source.ts";

const COL = [36, 70, 250, 505, 576] as const;
const TOP = 650;
const BOTTOM = 90;
const SIZE = 8;

function wrap(text: string, font: PDFFont, width: number): string[] {
  font.encodeText(text);
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (font.widthOfTextAtSize(word, SIZE) > width) {
      throw new Error(
        "Form 4797 line 2 statement has an unprintable source word",
      );
    }
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, SIZE) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface PrintedRow {
  readonly source: K1Section1231Row;
  readonly index: number;
  readonly entity: string[];
  readonly evidence: string[];
  readonly height: number;
}

export async function appendForm4797Line2Statement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  allPending: Record<string, Record<string, unknown>> | undefined,
): Promise<void> {
  if (fields.k1_1231_rows === undefined) return;
  if (!filer?.nameLine1 || !filer.primarySSN || !allPending) {
    throw new Error("Form 4797 line 2 K-1 rows need filer and source identity");
  }
  const rows = assertK1Section1231FilingLinks(
    fields.k1_1231_rows,
    allPending,
    filer,
  );
  if (fields.pdf_line2_overflow_rows === undefined) return;
  const overflow = z.array(k1Section1231RowSchema).min(2).parse(
    fields.pdf_line2_overflow_rows,
  );
  const subtotal = overflow.reduce((sum, row) => sum + row.gain_loss, 0);
  if (
    rows.length < 5 ||
    overflow.length !== rows.length - 3 ||
    overflow.some((row, index) =>
      JSON.stringify(row) !== JSON.stringify(rows[index + 3])
    ) ||
    fields.pdf_k1_line2_4_description !== "See attached" ||
    fields.pdf_k1_line2_4_gain !== subtotal ||
    fields.section_1231_gain !==
      rows.reduce((sum, row) => sum + row.gain_loss, 0) +
        Number(fields.gain_form6252 ?? 0) + Number(fields.gain_form8824 ?? 0)
  ) {
    throw new Error(
      "Form 4797 line 2 continuation does not reconcile to line 7",
    );
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const printed: PrintedRow[] = overflow.map((source, offset) => {
    const entity = [
      ...wrap(source.entity_name, font, COL[2] - COL[1] - 8),
      source.source_ein,
    ];
    const evidence = [
      ...wrap(
        `K-1: ${source.source_document_reference}`,
        font,
        COL[3] - COL[2] - 8,
      ),
      `Recipient TIN: ${source.recipient_tin}`,
    ];
    const height = Math.max(
      38,
      Math.max(entity.length, evidence.length) * 10 + 10,
    );
    if (height > TOP - BOTTOM) {
      throw new Error("Form 4797 line 2 source exceeds one continuation page");
    }
    return { source, index: offset + 4, entity, evidence, height };
  });
  const pages: PrintedRow[][] = [];
  let current: PrintedRow[] = [];
  let used = 0;
  for (const row of printed) {
    if (used + row.height > TOP - BOTTOM) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(row);
    used += row.height;
  }
  if (current.length) pages.push(current);
  pages.forEach((batch, pageIndex) => {
    const page = document.addPage([612, 792]);
    page.drawText(
      "2025 Form 4797, Part I, line 2 - K-1 section 1231 gain or loss (continued)",
      {
        x: 36,
        y: 748,
        size: 11,
        font: bold,
      },
    );
    page.drawText(`Name: ${filer.nameLine1}`, { x: 36, y: 729, size: 9, font });
    page.drawText(`SSN: ${filer.primarySSN}`, { x: 36, y: 714, size: 9, font });
    ["#", "Entity / EIN", "Issued K-1 source", "Gain/(loss)"].forEach((
      label,
      index,
    ) =>
      page.drawText(label, { x: COL[index] + 4, y: 675, size: 8, font: bold })
    );
    let y = TOP;
    const bottom = TOP - batch.reduce((sum, row) => sum + row.height, 0);
    for (const x of COL) {
      page.drawLine({
        start: { x, y: 689 },
        end: { x, y: bottom },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    page.drawLine({
      start: { x: COL[0], y: 689 },
      end: { x: COL[4], y: 689 },
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: COL[0], y },
      end: { x: COL[4], y },
      thickness: 0.5,
    });
    for (const row of batch) {
      const lineY = y - 12;
      page.drawText(String(row.index), {
        x: COL[0] + 4,
        y: lineY,
        size: SIZE,
        font,
      });
      row.entity.forEach((line, index) =>
        page.drawText(line, {
          x: COL[1] + 4,
          y: lineY - index * 10,
          size: SIZE,
          font,
        })
      );
      row.evidence.forEach((line, index) =>
        page.drawText(line, {
          x: COL[2] + 4,
          y: lineY - index * 10,
          size: SIZE,
          font,
        })
      );
      const amount = row.source.gain_loss.toLocaleString("en-US");
      const width = font.widthOfTextAtSize(amount, SIZE);
      if (width > COL[4] - COL[3] - 8) {
        throw new Error("Form 4797 line 2 statement amount is too wide");
      }
      page.drawText(amount, {
        x: COL[4] - 4 - width,
        y: lineY,
        size: SIZE,
        font,
      });
      y -= row.height;
      page.drawLine({
        start: { x: COL[0], y },
        end: { x: COL[4], y },
        thickness: 0.5,
      });
    }
    page.drawText(
      `Attached rows 4-${rows.length}: ${
        subtotal.toLocaleString("en-US")
      } (Form 4797 line 2, row 4)`,
      { x: 36, y: 66, size: 8, font },
    );
    page.drawText(
      `Form 4797 line 7: ${
        Number(fields.section_1231_gain).toLocaleString("en-US")
      }`,
      {
        x: 36,
        y: 53,
        size: 8,
        font,
      },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pages.length}`, {
      x: 510,
      y: 53,
      size: 8,
      font,
    });
  });
}
