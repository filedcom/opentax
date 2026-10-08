import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../mef/header.ts";

export interface Form8582Continuation {
  readonly part: string;
  readonly activity?: string;
  readonly firstRow: number;
  readonly headings: readonly string[];
  readonly widths: readonly number[];
  readonly rows: readonly (readonly string[])[];
  readonly totals: readonly string[];
}

/** IRS instructions permit an attached schedule in the same format as IV–IX. */
export async function appendForm8582Continuation(
  document: PDFDocument,
  tables: readonly Form8582Continuation[],
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (tables.length === 0) return;
  if (!filer?.nameLine1?.trim() || !/^\d{9}$/.test(filer.primarySSN)) {
    throw new Error("Form 8582 continuation needs filer identity");
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const wrap = (value: string, width: number, size: number): string[] => {
    font.encodeText(value);
    const lines: string[] = [];
    let rest = value;
    while (rest.length > 0) {
      let length = rest.length;
      while (
        length > 0 &&
        font.widthOfTextAtSize(rest.slice(0, length), size) > width
      ) length--;
      if (length === 0) {
        throw new Error("Form 8582 continuation text exceeds column width");
      }
      lines.push(rest.slice(0, length));
      rest = rest.slice(length);
    }
    return lines;
  };
  // Validate the complete layout before adding any supporting pages.
  const name = wrap(filer.fullName?.trim() || filer.nameLine1, 720, 9);
  if (name.length > 2) {
    throw new Error("Form 8582 continuation name exceeds header space");
  }
  const layouts = tables.map((table) => {
    if (
      table.headings.length !== table.widths.length ||
      table.totals.length !== table.widths.length
    ) {
      throw new Error("Form 8582 continuation column layout differs");
    }
    const headings = table.headings.map((v, i) =>
      wrap(v, table.widths[i] - 8, 8)
    );
    const rows = table.rows.map((row) => {
      if (row.length !== table.widths.length) {
        throw new Error("Form 8582 continuation row columns differ");
      }
      return row.map((v, i) => wrap(v, table.widths[i] - 8, 8));
    });
    const totals = table.totals.map((v, i) => wrap(v, table.widths[i] - 8, 8));
    const activity = wrap(table.activity ?? "", 720, 9);
    if (
      headings.some((v) => v.length > 4) || rows.some((r) =>
        r.some((v) => v.length > 4)
      ) || totals.some((v) => v.length > 4) || activity.length > 2
    ) {
      throw new Error("Form 8582 continuation text exceeds row space");
    }
    return { table, headings, rows, totals, activity };
  });
  for (const { table, headings, rows, totals, activity } of layouts) {
    for (let offset = 0; offset < rows.length; offset += 8) {
      const page = document.addPage([792, 612]);
      const text = (
        v: string,
        x: number,
        y: number,
        size = 8,
        strong = false,
      ) => page.drawText(v, { x, y, size, font: strong ? bold : font });
      text(
        `Form 8582 (2025) - Part ${table.part} continuation`,
        36,
        578,
        11,
        true,
      );
      name.forEach((v, i) => text(v, 36, 559 - i * 10, 9));
      text(`Taxpayer identification number: ${filer.primarySSN}`, 36, 532, 9);
      activity.forEach((v, i) =>
        text(
          `Name of activity${i === 0 ? ": " : " (continued): "}${v}`,
          36,
          516 - i * 10,
          9,
        )
      );
      const positions = table.widths.map((_, i) =>
        36 + table.widths.slice(0, i).reduce((a, b) => a + b, 0)
      );
      headings.forEach((lines, i) =>
        lines.forEach((v, j) => text(v, positions[i], 480 - j * 10, 8, true))
      );
      const batch = rows.slice(offset, offset + 8);
      batch.forEach((row, i) =>
        row.forEach((lines, c) =>
          lines.forEach((v, j) => text(v, positions[c], 432 - i * 40 - j * 9))
        )
      );
      text(
        "Whole worksheet totals (including rows on the IRS form):",
        36,
        96,
        9,
        true,
      );
      totals.forEach((lines, i) =>
        lines.forEach((v, j) => text(v, positions[i], 80 - j * 9))
      );
      text(
        `Rows ${table.firstRow + offset}-${
          table.firstRow + offset + batch.length - 1
        }; continuation page ${Math.floor(offset / 8) + 1} of ${
          Math.ceil(rows.length / 8)
        }`,
        36,
        30,
        9,
      );
    }
  }
}
