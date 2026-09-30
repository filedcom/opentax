import { type PDFDocument, StandardFonts } from "pdf-lib";

export interface ExpenseStatementRow {
  readonly description: string;
  readonly amount: number;
}

function wrapText(
  value: string,
  maxWidth: number,
  widthOf: (text: string) => number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (line && widthOf(line + character) > maxWidth) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function appendExpenseStatement(
  document: PDFDocument,
  options: {
    readonly title: string;
    readonly proprietorName: string;
    readonly proprietorSsn: string;
    readonly activityLabel: string;
    readonly destinationLabel: string;
    readonly rows: readonly ExpenseStatementRow[];
    readonly expectedTotal: number;
  },
): Promise<void> {
  const { rows } = options;
  if (rows.length === 0) return;
  const proprietor = options.proprietorName.trim();
  const ssn = options.proprietorSsn.replace(/\D/g, "");
  if (!proprietor || !/^\d{9}$/.test(ssn)) {
    throw new Error(`${options.title} needs proprietor identity`);
  }
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total !== options.expectedTotal) {
    throw new Error(`${options.title} total differs from printed line`);
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const amount = (value: number) => Math.round(value).toString();
  let page = document.addPage([612, 792]);
  let y = 694;
  let pageNumber = 0;
  const newPage = () => {
    if (pageNumber > 0) page = document.addPage([612, 792]);
    pageNumber++;
    page.drawText(options.title, { x: 40, y: 750, size: 12, font: bold });
    page.drawText(`${proprietor}  SSN ${ssn}`, {
      x: 40,
      y: 732,
      size: 9,
      font,
    });
    page.drawText(options.activityLabel, {
      x: 40,
      y: 718,
      size: 9,
      font,
    });
    page.drawText("Expense description", {
      x: 40,
      y: 694,
      size: 9,
      font: bold,
    });
    page.drawText("Amount", { x: 510, y: 694, size: 9, font: bold });
    y = 677;
  };
  newPage();
  for (const [index, row] of rows.entries()) {
    const lines = wrapText(
      row.description,
      445,
      (value) => font.widthOfTextAtSize(value, 9),
    );
    if (!lines.length) {
      throw new Error(`${options.title} needs an expense description`);
    }
    for (const line of lines) {
      if (y < 65) newPage();
      page.drawText(line, { x: 40, y, size: 9, font });
      y -= 13;
    }
    page.drawText(amount(row.amount), {
      x: 560 - font.widthOfTextAtSize(amount(row.amount), 9),
      y: y + 13,
      size: 9,
      font,
    });
    y -= index === rows.length - 1 ? 12 : 6;
  }
  if (y < 65) newPage();
  page.drawText(`Total carried to ${options.destinationLabel}`, {
    x: 40,
    y,
    size: 9,
    font: bold,
  });
  page.drawText(amount(total), {
    x: 560 - bold.widthOfTextAtSize(amount(total), 9),
    y,
    size: 9,
    font: bold,
  });
}
