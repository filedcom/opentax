import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

interface AllocationRow {
  policy_number: string;
  other_taxpayer_ssn: string;
  start_month: number;
  end_month: number;
  premium_pct?: number;
  slcsp_pct?: number;
  aptc_pct?: number;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 36;
const TABLE_TOP = 690;
const HEADER_HEIGHT = 34;
const ROW_HEIGHT = 21;
const ROWS_PER_PAGE = 25;
const WIDTHS = [115, 100, 50, 50, 75, 75, 75] as const;
const HEADERS = [
  "(a) Policy number",
  "(b) Other SSN",
  "(c) Start",
  "(d) End",
  "(e) Premium",
  "(f) SLCSP",
  "(g) APTC",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function allocationRow(value: unknown, index: number): AllocationRow {
  if (!isRecord(value)) {
    throw new Error(`Form 8962 allocation ${index + 1} is not a row`);
  }
  if (
    typeof value.policy_number !== "string" ||
    typeof value.other_taxpayer_ssn !== "string" ||
    typeof value.start_month !== "number" ||
    typeof value.end_month !== "number"
  ) {
    throw new Error(`Form 8962 allocation ${index + 1} lacks statement facts`);
  }
  for (const key of ["premium_pct", "slcsp_pct", "aptc_pct"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "number") {
      throw new Error(`Form 8962 allocation ${index + 1} has invalid ${key}`);
    }
  }
  return {
    policy_number: value.policy_number,
    other_taxpayer_ssn: value.other_taxpayer_ssn,
    start_month: value.start_month,
    end_month: value.end_month,
    ...(typeof value.premium_pct === "number"
      ? { premium_pct: value.premium_pct }
      : {}),
    ...(typeof value.slcsp_pct === "number"
      ? { slcsp_pct: value.slcsp_pct }
      : {}),
    ...(typeof value.aptc_pct === "number" ? { aptc_pct: value.aptc_pct } : {}),
  };
}

function cellValues(row: AllocationRow): string[] {
  return [
    row.policy_number,
    row.other_taxpayer_ssn,
    String(row.start_month).padStart(2, "0"),
    String(row.end_month).padStart(2, "0"),
    row.premium_pct === undefined ? "" : row.premium_pct.toFixed(2),
    row.slcsp_pct === undefined ? "" : row.slcsp_pct.toFixed(2),
    row.aptc_pct === undefined ? "" : row.aptc_pct.toFixed(2),
  ];
}

export async function appendForm8962AllocationStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const source = fields.shared_policy_allocations;
  if (!Array.isArray(source) || source.length <= 4) return;
  if (source.length > 99) {
    throw new Error("Form 8962 statement exceeds the 99-row MeF limit");
  }
  if (!filer) {
    throw new Error("Form 8962 allocation statement needs filer identity");
  }
  const overflow = source.slice(4).map((value, index) =>
    allocationRow(value, index + 4)
  );
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageCount = Math.ceil(overflow.length / ROWS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText(
      "Form 8962 (2025) Part IV - Additional Policy Amount Allocations",
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
      y: 710,
      size: 9,
      font,
    });
    const rows = overflow.slice(
      pageIndex * ROWS_PER_PAGE,
      (pageIndex + 1) * ROWS_PER_PAGE,
    );
    const tableBottom = TABLE_TOP - HEADER_HEIGHT - rows.length * ROW_HEIGHT;
    const border = rgb(0.55, 0.55, 0.55);
    const xPositions = [LEFT];
    for (const width of WIDTHS) {
      xPositions.push(xPositions[xPositions.length - 1] + width);
    }
    for (const x of xPositions) {
      page.drawLine({
        start: { x, y: TABLE_TOP },
        end: { x, y: tableBottom },
        thickness: 0.5,
        color: border,
      });
    }
    page.drawLine({
      start: { x: LEFT, y: TABLE_TOP },
      end: { x: LEFT + 540, y: TABLE_TOP },
      thickness: 0.5,
      color: border,
    });
    page.drawLine({
      start: { x: LEFT, y: TABLE_TOP - HEADER_HEIGHT },
      end: { x: LEFT + 540, y: TABLE_TOP - HEADER_HEIGHT },
      thickness: 0.5,
      color: border,
    });
    HEADERS.forEach((header, index) => {
      page.drawText(header, {
        x: xPositions[index] + 4,
        y: TABLE_TOP - 20,
        size: 7,
        font: bold,
      });
    });
    rows.forEach((row, rowIndex) => {
      const top = TABLE_TOP - HEADER_HEIGHT - rowIndex * ROW_HEIGHT;
      const values = cellValues(row);
      values.forEach((value, columnIndex) => {
        page.drawText(value, {
          x: xPositions[columnIndex] + 4,
          y: top - 14,
          size: 8,
          font,
        });
      });
      page.drawLine({
        start: { x: LEFT, y: top - ROW_HEIGHT },
        end: { x: LEFT + 540, y: top - ROW_HEIGHT },
        thickness: 0.5,
        color: border,
      });
    });
    page.drawText(
      `Additional allocation rows ${5 + pageIndex * ROWS_PER_PAGE}-${
        4 + pageIndex * ROWS_PER_PAGE + rows.length
      } of ${source.length}`,
      { x: LEFT, y: 46, size: 8, font },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: 508,
      y: 46,
      size: 8,
      font,
    });
  }
}
