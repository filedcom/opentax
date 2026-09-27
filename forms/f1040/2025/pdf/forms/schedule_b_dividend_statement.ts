import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

const PRINTED_ROWS = 15;
const ROWS_PER_PAGE = 30;

interface DividendRow {
  payerName: string;
  amount: number;
}

export async function appendScheduleBDividendStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const rows = fields.dividend_rows;
  if (!Array.isArray(rows) || rows.length <= PRINTED_ROWS) return;
  if (
    rows.some((row) =>
      row === null || typeof row !== "object" ||
      typeof row.payerName !== "string" || !row.payerName.trim() ||
      typeof row.amount !== "number" || !Number.isFinite(row.amount) ||
      row.amount < 0
    )
  ) {
    throw new Error("Schedule B additional dividend rows need named amounts");
  }
  const dividends = rows as DividendRow[];
  if (
    typeof fields.dividend_line5_subtotal === "number" &&
    Math.abs(
        dividends.reduce((sum, row) => sum + row.amount, 0) -
          fields.dividend_line5_subtotal,
      ) > 0.000001
  ) {
    throw new Error(
      "Schedule B dividend statement does not reconcile to line 5",
    );
  }
  if (!filer) {
    throw new Error("Schedule B dividend statement needs filer identity");
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const overflow = dividends.slice(PRINTED_ROWS);
  const pageCount = Math.ceil(overflow.length / ROWS_PER_PAGE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = document.addPage([612, 792]);
    page.drawText("Schedule B (Form 1040) 2025 - Additional Dividend Payers", {
      x: 36,
      y: 748,
      size: 11,
      font: bold,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: 36,
      y: 728,
      size: 9,
      font: regular,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: 36,
      y: 711,
      size: 9,
      font: regular,
    });
    page.drawText("Schedule B Part II, line 5 (continued)", {
      x: 36,
      y: 682,
      size: 9,
      font: bold,
    });
    page.drawText("Payer", { x: 36, y: 655, size: 9, font: bold });
    page.drawText("Dividend amount", {
      x: 465,
      y: 655,
      size: 9,
      font: bold,
    });
    page.drawLine({
      start: { x: 36, y: 646 },
      end: { x: 576, y: 646 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    const first = PRINTED_ROWS + pageIndex * ROWS_PER_PAGE;
    const last = Math.min(first + ROWS_PER_PAGE, dividends.length);
    for (let index = first; index < last; index++) {
      const y = 628 - (index - first) * 18;
      const payer = dividends[index].payerName;
      const nameSize = Math.min(
        9,
        420 * 9 / Math.max(420, regular.widthOfTextAtSize(payer, 9)),
      );
      if (nameSize < 6) {
        throw new Error(`Schedule B dividend payer ${index + 1} is too long`);
      }
      page.drawText(payer, { x: 36, y, size: nameSize, font: regular });
      page.drawText(String(Math.round(dividends[index].amount)), {
        x: 465,
        y,
        size: 9,
        font: regular,
      });
    }
    page.drawText(
      `Dividend payers ${
        first + 1
      }-${last} of ${dividends.length}. Total included in Schedule B line 5.`,
      { x: 36, y: 55, size: 8, font: regular },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: 508,
      y: 55,
      size: 8,
      font: regular,
    });
  }
}
