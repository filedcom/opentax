import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
const ROWS_PER_PAGE = 18;
const ROW_HEIGHT = 31;

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

export async function appendForm8874InvestmentStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const value = fields.print_overflow_rows;
  if (value === undefined) return;
  if (
    !Array.isArray(value) || value.length < 2 ||
    !value.every(isInvestmentRow)
  ) {
    throw new Error("Form 8874 overflow statement needs valid investment rows");
  }
  if (!filer) {
    throw new Error("Form 8874 overflow statement needs filer identity");
  }
  const rows = value as InvestmentRow[];
  const total = rows.reduce((sum, row) => sum + row.creditAmount, 0);
  if (
    total !== fields.row_6_credit ||
    typeof fields.line3 !== "number" ||
    typeof fields.line2 !== "number" ||
    fields.line3 - fields.line2 -
          Array.from(
            { length: 5 },
            (_, index) => fields[`row_${index + 1}_credit`],
          )
            .reduce<number>((sum, credit) => sum + Number(credit), 0) !== total
  ) {
    throw new Error(
      "Form 8874 overflow statement does not reconcile to line 1",
    );
  }

  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageCount = Math.ceil(rows.length / ROWS_PER_PAGE);
  const xPositions = [LEFT];
  for (const width of WIDTHS) xPositions.push(xPositions.at(-1)! + width);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
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

    const first = pageIndex * ROWS_PER_PAGE;
    const batch = rows.slice(first, first + ROWS_PER_PAGE);
    const top = 684;
    const headerBottom = 650;
    const bottom = headerBottom - batch.length * ROW_HEIGHT;
    const border = rgb(0.55, 0.55, 0.55);
    for (const x of xPositions) {
      page.drawLine({
        start: { x, y: top },
        end: { x, y: bottom },
        thickness: 0.5,
        color: border,
      });
    }
    for (
      const y of [
        top,
        headerBottom,
        ...batch.map((_, i) => headerBottom - (i + 1) * ROW_HEIGHT),
      ]
    ) {
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: 576, y },
        thickness: 0.5,
        color: border,
      });
    }
    HEADERS.forEach((header, index) => {
      page.drawText(header, {
        x: xPositions[index] + 3,
        y: 665,
        size: index === 0 ? 8 : 7,
        font: bold,
      });
    });

    batch.forEach((row, index) => {
      const y = headerBottom - index * ROW_HEIGHT - 11;
      const cdeText = [row.cdeName, row.address];
      cdeText.forEach((line, lineIndex) => {
        const width = font.widthOfTextAtSize(line, 8);
        const size = Math.min(8, 195 * 8 / Math.max(width, 195));
        if (size < 6) {
          throw new Error(
            `Form 8874 investment ${
              first + index + 6
            } is too long for the statement`,
          );
        }
        page.drawText(line, {
          x: LEFT + 3,
          y: y - lineIndex * 11,
          size,
          font,
        });
      });
      const values = [
        row.ein,
        row.initialDate,
        row.investmentAmount.toLocaleString("en-US"),
        String(row.rate),
        row.creditAmount.toLocaleString("en-US"),
      ];
      values.forEach((cell, column) => {
        const x = xPositions[column + 1] + 3;
        const available = WIDTHS[column + 1] - 6;
        const width = font.widthOfTextAtSize(cell, 8);
        const size = Math.min(8, available * 8 / Math.max(width, available));
        if (size < 6) {
          throw new Error(
            `Form 8874 investment ${
              first + index + 6
            } has an unprintable value`,
          );
        }
        page.drawText(cell, { x, y, size, font });
      });
    });
    page.drawText(
      `Attached credits: ${
        total.toLocaleString("en-US")
      }; Form 8874 line 1, last row, column (f).`,
      { x: LEFT, y: 55, size: 8, font },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: 506,
      y: 55,
      size: 8,
      font,
    });
  }
}
