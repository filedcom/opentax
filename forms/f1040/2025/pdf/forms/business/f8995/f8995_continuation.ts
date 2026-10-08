import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { z } from "zod";

/** IRS Form 8995 line 2 requires a statement for businesses beyond five rows. */
export async function appendQbiBusinessContinuation(
  document: PDFDocument,
  source: unknown,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const rows = z.array(
    z.object({
      businessName: z.string().min(1).max(75),
      tin: z.object({
        kind: z.enum(["ein", "ssn"]),
        value: z.string().regex(/^\d{9}$/),
      }),
      qbi: z.number().int(),
    }),
  ).parse(source ?? []);
  if (rows.length === 0) return;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 8995 business continuation needs filer identity");
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const perPage = 14;
  for (let offset = 0; offset < rows.length; offset += perPage) {
    const page = document.addPage([612, 792]);
    page.drawText("Form 8995 (2025) - Additional Businesses for Line 2", {
      x: 40,
      y: 748,
      size: 12,
      font: bold,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: 40,
      y: 727,
      size: 10,
      font,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: 40,
      y: 711,
      size: 10,
      font,
    });
    page.drawText(
      "These business income and loss amounts are included in line 2.",
      { x: 40, y: 685, size: 10, font },
    );
    for (const [index, row] of rows.slice(offset, offset + perPage).entries()) {
      const y = 655 - index * 40;
      let name = `${offset + index + 6}. ${row.businessName}`;
      let line = 0;
      while (name.length > 0) {
        let length = name.length;
        while (font.widthOfTextAtSize(name.slice(0, length), 9) > 530) length--;
        page.drawText(name.slice(0, length), {
          x: 40,
          y: y - line * 11,
          size: 9,
          font,
        });
        name = name.slice(length);
        line++;
      }
      page.drawText(
        `${row.tin.kind.toUpperCase()}: ${row.tin.value}    QBI or (loss): ${row.qbi}`,
        { x: 55, y: y - 25, size: 9, font },
      );
    }
    page.drawText(
      `Page ${Math.floor(offset / perPage) + 1} of ${
        Math.ceil(rows.length / perPage)
      }`,
      { x: 470, y: 45, size: 9, font },
    );
  }
}
