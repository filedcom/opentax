import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  inputSchema as f1099rInputSchema,
  iraDistributionExplanation,
} from "../../../nodes/inputs/f1099r/index.ts";

export async function appendIraDistributionStatement(
  document: PDFDocument,
  source: unknown,
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (source === undefined) return;
  const parsed = f1099rInputSchema.parse(source);
  const explanation = iraDistributionExplanation(parsed.f1099rs);
  if (explanation === undefined) return;
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("IRA distribution PDF statement needs filer identity");
  }

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = 530;
  const lines: string[] = [];
  let line = "";
  for (const word of explanation.split(" ")) {
    if (regular.widthOfTextAtSize(word, 9) > width) {
      throw new Error("IRA distribution statement has an unprintable word");
    }
    const next = line ? `${line} ${word}` : word;
    if (regular.widthOfTextAtSize(next, 9) <= width) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const linesPerPage = 42;
  for (let first = 0; first < lines.length; first += linesPerPage) {
    const page = document.addPage([612, 792]);
    const pageNumber = Math.floor(first / linesPerPage) + 1;
    page.drawText("Form 1040 (2025) - IRA Distribution Statement", {
      x: 40,
      y: 748,
      size: 12,
      font: bold,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: 40,
      y: 727,
      size: 9,
      font: regular,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: 40,
      y: 711,
      size: 9,
      font: regular,
    });
    page.drawText("Form 1040 line 4c(1) rollover explanation", {
      x: 40,
      y: 678,
      size: 9,
      font: bold,
    });
    for (
      const [index, text] of lines.slice(first, first + linesPerPage).entries()
    ) {
      page.drawText(text, {
        x: 40,
        y: 651 - index * 13,
        size: 9,
        font: regular,
      });
    }
    page.drawText(
      `Page ${pageNumber} of ${Math.ceil(lines.length / linesPerPage)}`,
      {
        x: 500,
        y: 45,
        size: 8,
        font: regular,
      },
    );
  }
}
