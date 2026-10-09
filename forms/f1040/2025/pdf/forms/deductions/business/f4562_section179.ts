import { type PDFDocument, StandardFonts } from "pdf-lib";
import type { z } from "zod";
import { section179SummarySchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/section179-inventory.ts";

export function section179PdfFields(
  summary: z.infer<typeof section179SummarySchema>,
) {
  const [first, second] = summary.properties;
  return {
    ...summary,
    asset_description: first.description,
    section179_first_property_cost: first.cost,
    line6_elected_cost: first.elected,
    section179_second_description: second?.description,
    section179_second_cost: second?.cost,
    section179_second_elected: second?.elected,
    section179_overflow: summary.properties.slice(2),
  };
}

export async function appendSection179Properties(
  document: PDFDocument,
  raw: unknown,
  name: string,
  ssn: string,
) {
  const rows = section179SummarySchema.shape.properties.parse(raw);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (let start = 0; start < rows.length; start += 10) {
    const page = document.addPage([612, 792]);
    page.drawText("Form 4562 - Part I, line 6 continuation", {
      x: 40,
      y: 750,
      size: 13,
      font: bold,
    });
    page.drawText(`2025 | ${name} | ${ssn}`, {
      x: 40,
      y: 729,
      size: 10,
      font: regular,
    });
    page.drawText("Description of property", {
      x: 40,
      y: 694,
      size: 10,
      font: bold,
    });
    page.drawText("Business cost", { x: 380, y: 694, size: 10, font: bold });
    page.drawText("Elected cost", { x: 480, y: 694, size: 10, font: bold });
    rows.slice(start, start + 10).forEach((row, i) => {
      const y = 666 - i * 54;
      const lines = [...row.description].reduce<string[]>((out, char) => {
        const candidate = (out.at(-1) ?? "") + char;
        return regular.widthOfTextAtSize(candidate, 9) <= 320
          ? [...out.slice(0, -1), candidate]
          : [...out, char];
      }, []);
      lines.forEach((line, j) =>
        page.drawText(line, { x: 40, y: y - j * 12, size: 9, font: regular })
      );
      page.drawText(String(row.cost), { x: 380, y, size: 10, font: regular });
      page.drawText(String(row.elected), {
        x: 480,
        y,
        size: 10,
        font: regular,
      });
    });
  }
}
