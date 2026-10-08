import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import type { Form8621Lines } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { explainForm8621ExcessEvent } from "../../../../mef/forms/income/foreign/f8621_excess_statement.ts";

const left = 42;
const top = 748;
const bottom = 48;
const pageWidth = 612;
const pageHeight = 792;
const textWidth = pageWidth - 2 * left;

/** Print the same source-rederived Part V holding-period explanation as MeF. */
export async function appendForm8621ExcessStatement(
  document: PDFDocument,
  lines: readonly Form8621Lines[],
  filer: FilerIdentity | undefined,
): Promise<number> {
  const reportable = lines.flatMap((line) =>
    line.excessEvents.flatMap((event, index) =>
      event.amount_usd > 0 ? [{ line, event, index }] : []
    )
  );
  if (reportable.length === 0) return 0;
  const name = filer?.fullName ?? filer?.nameLine1;
  const ssn = filer?.primarySSN?.replaceAll("-", "");
  if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
    throw new Error("Form 8621 excess statement needs filer name and SSN");
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let added = 0;

  for (const { line, event, index } of reportable) {
    const explanation = explainForm8621ExcessEvent(line, index);
    const heading = `Form 8621 Part V, line 16a - ${line.item.company_name}`;
    const identity = `${name} | SSN ${ssn} | Tax year 2025 | Event ${
      index + 1
    } on ${event.event_date} | ${line.item.company_ein_or_ref}`;
    if (
      !/^[\x20-\x7E]*$/.test(`${heading}${identity}${explanation}`)
    ) {
      throw new Error(
        "Form 8621 excess statement needs printable ASCII source text",
      );
    }
    if (
      bold.widthOfTextAtSize(`${heading} (continued)`, 11) > textWidth ||
      font.widthOfTextAtSize(identity, 9) > textWidth
    ) {
      throw new Error("Form 8621 excess statement heading is too long");
    }
    let page = document.addPage([pageWidth, pageHeight]);
    added++;
    let y = top;
    const newPage = () => {
      page = document.addPage([pageWidth, pageHeight]);
      added++;
      y = top;
      page.drawText(`${heading} (continued)`, {
        x: left,
        y,
        font: bold,
        size: 11,
      });
      y -= 22;
      page.drawText(identity, { x: left, y, font, size: 9 });
      y -= 26;
    };
    page.drawText(heading, { x: left, y, font: bold, size: 11 });
    y -= 22;
    page.drawText(identity, { x: left, y, font, size: 9 });
    y -= 28;
    for (const paragraph of explanation.split(/(?<=\.)\s+/)) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, 9) <= textWidth) {
          current = candidate;
          continue;
        }
        if (current) {
          if (y < bottom) newPage();
          page.drawText(current, { x: left, y, font, size: 9 });
          y -= 14;
        }
        if (font.widthOfTextAtSize(word, 9) > textWidth) {
          throw new Error(
            "Form 8621 excess statement has an overlong source token",
          );
        }
        current = word;
      }
      if (current) {
        if (y < bottom) newPage();
        page.drawText(current, { x: left, y, font, size: 9 });
        y -= 20;
      }
    }
  }
  return added;
}
