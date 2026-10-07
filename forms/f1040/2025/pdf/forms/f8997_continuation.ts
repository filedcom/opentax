import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { Form8997Statement } from "../../../nodes/inputs/f8997/ledger.ts";

/** Retain columns (a)-(f) beyond the five printed rows in each part. */
export async function appendForm8997Continuation(
  document: PDFDocument,
  statement: Form8997Statement,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const parts = [
    statement.part_i,
    statement.part_ii,
    statement.part_iii,
    statement.part_iv,
  ];
  if (parts.every((part) => part.rows.length <= 5)) return;
  if (!filer?.nameLine1?.trim() || !/^\d{9}$/.test(filer.primarySSN)) {
    throw new Error("Form 8997 continuation needs filer identity");
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const labels = [
    "I - Beginning holdings",
    "II - Current deferrals",
    "III - Inclusion events",
    "IV - Year-end holdings",
  ];
  const perPage = 8;
  const x = [36, 102, 174, 352, 394, 489];
  // Check encoding before adding pages; unsupported text must never disappear.
  font.encodeText(filer.nameLine1);
  for (const part of parts) {
    for (const row of part.rows.slice(5)) font.encodeText(row.description);
  }
  for (const [partIndex, part] of parts.entries()) {
    const rows = part.rows.slice(5);
    const totals = rows.reduce((sum, row) => ({
      short: sum.short + row.short_term,
      long: sum.long + row.long_term,
    }), { short: 0, long: 0 });
    for (let offset = 0; offset < rows.length; offset += perPage) {
      const page = document.addPage([612, 792]);
      const text = (
        value: string,
        left: number,
        y: number,
        size = 8,
        strong = false,
      ) => {
        page.drawText(value, { x: left, y, size, font: strong ? bold : font });
      };
      text(
        `Form 8997 (2025) - Part ${labels[partIndex]} continuation`,
        36,
        750,
        11,
        true,
      );
      let name = filer.nameLine1;
      let nameY = 729;
      while (name.length) {
        let length = name.length;
        while (font.widthOfTextAtSize(name.slice(0, length), 9) > 540) length--;
        text(name.slice(0, length), 36, nameY, 9);
        name = name.slice(length);
        nameY -= 11;
      }
      if (nameY < 700) {
        throw new Error(
          "Form 8997 continuation filer name exceeds header space",
        );
      }
      text(`Taxpayer identification number: ${filer.primarySSN}`, 36, 691, 9);
      const headers = [
        "(a) QOF EIN",
        partIndex === 2 ? "(b) Event date" : "(b) Acquired",
        "(c) Description",
        "(d) Code",
        "(e) Short-term",
        "(f) Long-term",
      ];
      headers.forEach((header, column) =>
        text(header, x[column], 668, 8, true)
      );
      const currentRows = rows.slice(offset, offset + perPage);
      for (const [index, row] of currentRows.entries()) {
        const y = 642 - index * 60;
        const [year, month, day] = row.date.split("-");
        text(row.qof_ein, x[0], y);
        text(`${month}/${day}/${year}`, x[1], y);
        text(row.special_gain_code ?? "", x[3], y);
        for (
          const [column, value] of [[4, row.short_term], [
            5,
            row.long_term,
          ]] as const
        ) {
          const printed = value.toLocaleString("en-US");
          let size = 8;
          while (font.widthOfTextAtSize(printed, size) > 83 && size >= 6) {
            size -= 0.5;
          }
          if (size < 6) {
            throw new Error(
              "Form 8997 continuation amount exceeds column width",
            );
          }
          text(printed, x[column], y, size);
        }
        let remaining = row.description;
        let line = 0;
        while (remaining.length) {
          let length = remaining.length;
          while (font.widthOfTextAtSize(remaining.slice(0, length), 8) > 168) {
            length--;
          }
          if (line >= 5) {
            throw new Error(
              "Form 8997 continuation description exceeds row space",
            );
          }
          text(remaining.slice(0, length), x[2], y - line * 10);
          remaining = remaining.slice(length);
          line++;
        }
      }
      const pageTotals = currentRows.reduce(
        (sum, row) => ({
          short: sum.short + row.short_term,
          long: sum.long + row.long_term,
        }),
        { short: 0, long: 0 },
      );
      text(
        `This page: short-term ${
          pageTotals.short.toLocaleString("en-US")
        } / long-term ${pageTotals.long.toLocaleString("en-US")}`,
        36,
        132,
        9,
      );
      text(
        `All Part ${
          ["I", "II", "III", "IV"][partIndex]
        } continuation totals for line 1: short-term ${
          totals.short.toLocaleString("en-US")
        } / long-term ${totals.long.toLocaleString("en-US")}`,
        36,
        114,
        9,
      );
      text(
        `Rows ${offset + 6}-${
          offset + currentRows.length + 5
        }; continuation page ${Math.floor(offset / perPage) + 1} of ${
          Math.ceil(rows.length / perPage)
        }`,
        36,
        48,
        9,
      );
    }
  }
}
