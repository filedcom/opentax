import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import { schedule1OtherIncomeRows } from "../../mef/forms/schedule1_other_income_rows.ts";

/** Print the same identified Schedule 1 line 8z rows as the native statement. */
export async function appendSchedule1OtherIncomeStatement(
  document: PDFDocument,
  printed: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
  rawSchedule1: unknown,
): Promise<void> {
  if (
    rawSchedule1 === undefined || rawSchedule1 === null ||
    typeof rawSchedule1 !== "object" || Array.isArray(rawSchedule1)
  ) {
    if (printed.line8z_other !== undefined) {
      throw new Error("Schedule 1 line 8z PDF statement needs source rows");
    }
    return;
  }
  const rows = schedule1OtherIncomeRows(rawSchedule1);
  if (rows.length === 0) {
    if (printed.line8z_other !== undefined) {
      throw new Error("Schedule 1 line 8z PDF has no source rows");
    }
    return;
  }
  if (rows.length > 100) {
    throw new Error("Schedule 1 line 8z exceeds statement row capacity");
  }
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (
    printed.line8z_other !== total ||
    printed.line8z_description !== "SEE STATEMENT"
  ) {
    throw new Error("Schedule 1 line 8z PDF differs from source statement");
  }
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Schedule 1 line 8z PDF statement needs filer identity");
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const size = 9;
  const labelWidth = 430;
  const wrap = (value: string): string[] => {
    const lines: string[] = [];
    let current = "";
    for (const word of value.split(/\s+/).filter(Boolean)) {
      if (regular.widthOfTextAtSize(word, size) > labelWidth) {
        throw new Error("Schedule 1 line 8z statement label cannot fit");
      }
      const next = current ? `${current} ${word}` : word;
      if (regular.widthOfTextAtSize(next, size) <= labelWidth) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    if (lines.length === 0) {
      throw new Error("Schedule 1 line 8z statement label is empty");
    }
    return lines;
  };
  if (regular.widthOfTextAtSize(filer.nameLine1, size) > 440) {
    throw new Error("Schedule 1 line 8z statement filer name cannot fit");
  }
  const pageHeight = 792;
  let page = document.addPage([612, pageHeight]);
  let pageNumber = 0;
  let y = 677;
  const startPage = () => {
    if (pageNumber > 0) page = document.addPage([612, pageHeight]);
    pageNumber++;
    page.drawText(
      "2025 Schedule 1 (Form 1040) line 8z - Other Income Statement",
      {
        x: 40,
        y: 750,
        size: 11,
        font: bold,
      },
    );
    page.drawText(filer.nameLine1, { x: 40, y: 729, size, font: regular });
    page.drawText(`SSN ${filer.primarySSN}`, {
      x: 40,
      y: 713,
      size,
      font: regular,
    });
    page.drawText("Type of income", { x: 40, y: 691, size, font: bold });
    page.drawText("Amount", { x: 512, y: 691, size, font: bold });
    y = 677;
  };
  startPage();
  for (const row of rows) {
    const lines = wrap(row.label);
    const amount = Math.round(row.amount).toLocaleString("en-US");
    if (regular.widthOfTextAtSize(amount, size) > 60) {
      throw new Error("Schedule 1 line 8z statement amount cannot fit");
    }
    for (const [index, text] of lines.entries()) {
      if (y < 90) {
        startPage();
        if (index > 0) {
          page.drawText("Line 8z type continued from prior page", {
            x: 40,
            y,
            size,
            font: bold,
          });
          y -= 13;
        }
      }
      page.drawText(text, { x: 40, y, size, font: regular });
      if (index === 0) {
        page.drawText(amount, {
          x: 570 - regular.widthOfTextAtSize(amount, size),
          y,
          size,
          font: regular,
        });
      }
      y -= 13;
    }
    y -= 3;
  }
  if (y < 90) startPage();
  const totalText = Math.round(total).toLocaleString("en-US");
  if (bold.widthOfTextAtSize(totalText, size) > 60) {
    throw new Error("Schedule 1 line 8z statement total cannot fit");
  }
  page.drawText("Total - Schedule 1 line 8z", {
    x: 40,
    y: y - 7,
    size,
    font: bold,
  });
  page.drawText(totalText, {
    x: 570 - bold.widthOfTextAtSize(totalText, size),
    y: y - 7,
    size,
    font: bold,
  });
}
