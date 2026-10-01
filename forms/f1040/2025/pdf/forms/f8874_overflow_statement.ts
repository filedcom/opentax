import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

interface InvestmentRow {
  cdeName: string;
  address: string;
  ein: string;
  initialDate: string;
  investmentAmount: number;
  rate: number;
  creditAmount: number;
}

interface LaidOutRow {
  readonly investment: InvestmentRow;
  readonly textLines: readonly string[];
  readonly height: number;
}

const LEFT = 36;
const WIDTHS = [201, 68, 69, 73, 42, 87] as const;
const HEADERS = [
  "(a) CDE name and address",
  "(b) EIN",
  "(c) Initial date",
  "(d) Investment",
  "(e) Rate",
  "(f) Credit",
] as const;
const MAX_BODY_HEIGHT = 558;
const MIN_ROW_HEIGHT = 31;
const TEXT_WIDTH = WIDTHS[0] - 6;

function isInvestmentRow(value: unknown): value is InvestmentRow {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return typeof row.cdeName === "string" && row.cdeName.trim().length > 0 &&
    typeof row.address === "string" && row.address.trim().length > 0 &&
    typeof row.ein === "string" && /^\d{2}-\d{7}$/.test(row.ein) &&
    typeof row.initialDate === "string" &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(row.initialDate) &&
    typeof row.investmentAmount === "number" &&
    Number.isSafeInteger(row.investmentAmount) && row.investmentAmount > 0 &&
    (row.rate === 5 || row.rate === 6) &&
    typeof row.creditAmount === "number" &&
    Number.isSafeInteger(row.creditAmount) && row.creditAmount > 0 &&
    Math.round(row.investmentAmount * row.rate / 100) === row.creditAmount;
}

function wrapText(text: string, font: PDFFont): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (font.widthOfTextAtSize(word, 8) > TEXT_WIDTH) {
      throw new Error(
        "Form 8874 CDE text has a word too wide for the statement",
      );
    }
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, 8) > TEXT_WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paginateRows(
  rows: readonly InvestmentRow[],
  font: PDFFont,
): LaidOutRow[][] {
  const pages: LaidOutRow[][] = [];
  let page: LaidOutRow[] = [];
  let used = 0;
  for (const investment of rows) {
    const textLines = [
      ...wrapText(investment.cdeName, font),
      ...wrapText(investment.address, font),
    ];
    const height = Math.max(MIN_ROW_HEIGHT, textLines.length * 10 + 9);
    if (height > MAX_BODY_HEIGHT) {
      throw new Error("Form 8874 CDE text exceeds one statement page");
    }
    if (used + height > MAX_BODY_HEIGHT) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push({ investment, textLines, height });
    used += height;
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

export async function appendForm8874InvestmentStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const value = fields.print_overflow_rows;
  if (value === undefined) return;
  if (
    !Array.isArray(value) || value.length < 1 ||
    !value.every(isInvestmentRow)
  ) {
    throw new Error("Form 8874 overflow statement needs valid investment rows");
  }
  if (!filer) {
    throw new Error("Form 8874 overflow statement needs filer identity");
  }
  const rows = value as InvestmentRow[];
  const total = rows.reduce((sum, row) => sum + row.creditAmount, 0);
  const directTotal = Array.from(
    { length: 5 },
    (_, index) => fields[`row_${index + 1}_credit`],
  ).reduce<number>((sum, credit) => sum + Number(credit ?? 0), 0);
  if (
    fields.row_6_cde !== "See attached" ||
    total !== fields.row_6_credit ||
    typeof fields.line3 !== "number" ||
    typeof fields.line2 !== "number" ||
    fields.line3 - fields.line2 - directTotal !== total
  ) {
    throw new Error(
      "Form 8874 overflow statement does not reconcile to line 1",
    );
  }

  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = paginateRows(rows, font);
  const xPositions = [LEFT];
  for (const width of WIDTHS) xPositions.push(xPositions.at(-1)! + width);

  pages.forEach((batch, pageIndex) => {
    const page = document.addPage([612, 792]);
    page.drawText(
      "Form 8874 - Line 1 Qualified Equity Investments (continued)",
      {
        x: LEFT,
        y: 748,
        size: 11,
        font: bold,
      },
    );
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: LEFT,
      y: 728,
      size: 9,
      font,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: LEFT,
      y: 711,
      size: 9,
      font,
    });

    const top = 684;
    const headerBottom = 650;
    const bottom = headerBottom -
      batch.reduce((sum, row) => sum + row.height, 0);
    const border = rgb(0.55, 0.55, 0.55);
    for (const x of xPositions) {
      page.drawLine({
        start: { x, y: top },
        end: { x, y: bottom },
        thickness: 0.5,
        color: border,
      });
    }
    page.drawLine({
      start: { x: LEFT, y: top },
      end: { x: 576, y: top },
      thickness: 0.5,
      color: border,
    });
    page.drawLine({
      start: { x: LEFT, y: headerBottom },
      end: { x: 576, y: headerBottom },
      thickness: 0.5,
      color: border,
    });
    HEADERS.forEach((header, index) => {
      page.drawText(header, {
        x: xPositions[index] + 3,
        y: 665,
        size: index === 0 ? 8 : 7,
        font: bold,
      });
    });

    let rowTop = headerBottom;
    batch.forEach(({ investment, textLines, height }, index) => {
      const y = rowTop - 11;
      textLines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: LEFT + 3,
          y: y - lineIndex * 10,
          size: 8,
          font,
        });
      });
      const values = [
        investment.ein,
        investment.initialDate,
        investment.investmentAmount.toLocaleString("en-US"),
        String(investment.rate),
        investment.creditAmount.toLocaleString("en-US"),
      ];
      values.forEach((cell, column) => {
        const x = xPositions[column + 1] + 3;
        const available = WIDTHS[column + 1] - 6;
        const width = font.widthOfTextAtSize(cell, 8);
        const size = Math.min(8, available * 8 / Math.max(width, available));
        if (size < 6) {
          throw new Error(
            `Form 8874 statement row ${index + 1} has an unprintable value`,
          );
        }
        page.drawText(cell, { x, y, size, font });
      });
      rowTop -= height;
      page.drawLine({
        start: { x: LEFT, y: rowTop },
        end: { x: 576, y: rowTop },
        thickness: 0.5,
        color: border,
      });
    });
    page.drawText(
      `Attached credits: ${
        total.toLocaleString("en-US")
      }; Form 8874 line 1, last row, column (f).`,
      { x: LEFT, y: 55, size: 8, font },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pages.length}`, {
      x: 506,
      y: 55,
      size: 8,
      font,
    });
  });
}
