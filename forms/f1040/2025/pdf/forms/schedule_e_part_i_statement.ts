import { type PDFDocument, type PDFPage, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

interface StatementRow {
  readonly copy: number;
  readonly column: string;
  readonly property: string;
  readonly address?: string;
  readonly line: string;
  readonly description: string;
  readonly amount?: number;
}

function wrap(
  value: string,
  width: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    for (const character of word) {
      if (current && measure(current + character) > width) {
        lines.push(current);
        current = "";
      }
      current += character;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function appendScheduleEPartIStatement(
  document: PDFDocument,
  rawRows: unknown,
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (rawRows === undefined) return;
  if (!Array.isArray(rawRows)) {
    throw new Error("Schedule E Part I statement needs property detail rows");
  }
  const rows = rawRows as StatementRow[];
  if (rows.length === 0) return;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Schedule E Part I statement needs filer identity");
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const measure = (value: string) => regular.widthOfTextAtSize(value, 9);
  const pages: PDFPage[] = [];
  let page = document.addPage([612, 792]);
  let y = 686;
  const newPage = () => {
    if (pages.length > 0) page = document.addPage([612, 792]);
    pages.push(page);
    page.drawText("Schedule E (Form 1040) 2025 - Part I property details", {
      x: 40,
      y: 750,
      size: 12,
      font: bold,
    });
    page.drawText(`${filer.nameLine1}  SSN ${filer.primarySSN}`, {
      x: 40,
      y: 730,
      size: 9,
      font: regular,
    });
    page.drawText("Descriptions supporting property type 8 and line 19", {
      x: 40,
      y: 709,
      size: 9,
      font: regular,
    });
    y = 686;
  };
  newPage();
  for (const row of rows) {
    if (
      !Number.isInteger(row.copy) || row.copy < 1 ||
      !["A", "B", "C"].includes(row.column) ||
      !row.property?.trim() || !row.description?.trim() ||
      !["Type 8", "19"].includes(row.line) ||
      (row.line === "19" &&
        (!Number.isSafeInteger(row.amount) || row.amount! < 0))
    ) {
      throw new Error(
        "Schedule E Part I statement has invalid property detail",
      );
    }
    const heading = wrap(
      `Schedule E copy ${row.copy}, property ${row.column}: ${row.property}`,
      530,
      measure,
    );
    const address = row.address ? wrap(row.address, 530, measure) : [];
    const detail = wrap(
      `${
        row.line === "19" ? "Line 19" : "Property type 8"
      }: ${row.description}`,
      row.amount === undefined ? 530 : 455,
      measure,
    );
    if (y < 120) newPage();
    const writeLine = (line: string, x: number, font: typeof regular) => {
      if (y < 55) newPage();
      page.drawText(line, { x, y, size: 9, font });
      y -= 13;
    };
    for (const line of heading) {
      writeLine(line, 40, bold);
    }
    for (const line of address) {
      writeLine(line, 52, regular);
    }
    for (const [index, line] of detail.entries()) {
      writeLine(line, 52, regular);
      if (index === detail.length - 1 && row.amount !== undefined) {
        const amount = String(row.amount);
        page.drawText(amount, {
          x: 560 - regular.widthOfTextAtSize(amount, 9),
          y: y + 13,
          size: 9,
          font: regular,
        });
      }
    }
    y -= 13;
  }
  for (const [index, statementPage] of pages.entries()) {
    statementPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: 505,
      y: 35,
      size: 8,
      font: regular,
    });
  }
}
