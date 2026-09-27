import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

const PRINTED_ROWS = 14;
const ROWS_PER_PAGE = 30;
const LEFT = 36;

interface InterestRow {
  payerName: string;
  amount: number;
}

export async function appendScheduleBInterestStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const rows = fields.print_interest_rows;
  if (!Array.isArray(rows) || rows.length <= PRINTED_ROWS) return;
  if (
    rows.some((row) =>
      row === null || typeof row !== "object" ||
      typeof row.payerName !== "string" || !row.payerName.trim() ||
      typeof row.amount !== "number"
    )
  ) {
    throw new Error(
      "Schedule B additional interest rows need paired payer names and amounts",
    );
  }
  const interestRows = rows as InterestRow[];
  if (
    interestRows.some((row) => !Number.isFinite(row.amount) || row.amount < 0)
  ) {
    throw new Error(
      "Schedule B additional interest rows need nonnegative finite amounts",
    );
  }
  if (
    typeof fields.interest_line1_subtotal === "number" &&
    Math.abs(
        interestRows.reduce((sum, row) => sum + row.amount, 0) -
          fields.interest_line1_subtotal,
      ) > 0.000001
  ) {
    throw new Error(
      "Schedule B additional interest rows do not reconcile to line 1",
    );
  }
  if (!filer) {
    throw new Error("Schedule B interest statement needs filer identity");
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const overflow = interestRows.slice(PRINTED_ROWS);
  const pageCount = Math.ceil(overflow.length / ROWS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = document.addPage([612, 792]);
    page.drawText("Schedule B (Form 1040) 2025 - Additional Interest Payers", {
      x: LEFT,
      y: 748,
      size: 11,
      font: bold,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: LEFT,
      y: 728,
      size: 9,
      font: regular,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: LEFT,
      y: 711,
      size: 9,
      font: regular,
    });
    page.drawText("Schedule B Part I, line 1 (continued)", {
      x: LEFT,
      y: 682,
      size: 9,
      font: bold,
    });
    page.drawText("Payer", { x: LEFT, y: 655, size: 9, font: bold });
    page.drawText("Interest amount", {
      x: 465,
      y: 655,
      size: 9,
      font: bold,
    });
    page.drawLine({
      start: { x: LEFT, y: 646 },
      end: { x: 576, y: 646 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });

    const first = PRINTED_ROWS + pageIndex * ROWS_PER_PAGE;
    const last = Math.min(first + ROWS_PER_PAGE, interestRows.length);
    for (let index = first; index < last; index++) {
      const y = 628 - (index - first) * 18;
      const payer = interestRows[index].payerName;
      const nameSize = Math.min(
        9,
        420 * 9 / Math.max(420, regular.widthOfTextAtSize(payer, 9)),
      );
      if (nameSize < 6) {
        throw new Error(
          `Schedule B interest payer ${
            index + 1
          } is too long for the statement`,
        );
      }
      page.drawText(payer, { x: LEFT, y, size: nameSize, font: regular });
      page.drawText(String(Math.round(interestRows[index].amount)), {
        x: 465,
        y,
        size: 9,
        font: regular,
      });
    }
    page.drawText(
      `Interest payers ${
        first + 1
      }-${last} of ${interestRows.length}. Total included in Schedule B line 1.`,
      { x: LEFT, y: 55, size: 8, font: regular },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: 508,
      y: 55,
      size: 8,
      font: regular,
    });
  }
}
