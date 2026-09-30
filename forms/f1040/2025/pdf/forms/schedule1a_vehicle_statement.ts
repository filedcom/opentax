import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { FilerIdentity } from "../../../mef/header.ts";

const rowSchema = z.object({
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/),
  deducted_elsewhere: z.literal(0),
  schedule1a_interest: z.number().int().positive(),
}).strict();

const LEFT = 36;
const RIGHT = 576;
const ROW_HEIGHT = 30;
const ROWS_PER_PAGE = 16;

export async function appendSchedule1AVehicleStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (fields.line22_overflow_vehicles === undefined) return;
  const rows = z.array(rowSchema).min(2).max(49).parse(
    fields.line22_overflow_vehicles,
  );
  const sourceRows = z.array(rowSchema).min(3).max(50).parse(
    fields.line22_vehicles,
  );
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Schedule 1-A line 22 statement needs filer identity");
  }
  const attachedInterest = rows.reduce(
    (sum, row) => sum + row.schedule1a_interest,
    0,
  );
  const attachedElsewhere = rows.reduce(
    (sum, row) => sum + row.deducted_elsewhere,
    0,
  );
  if (
    fields.line22b_vin !== "SEEATTACHED" ||
    fields.line22a_vin !== sourceRows[0].vin ||
    fields.line22a_interest !== sourceRows[0].schedule1a_interest ||
    JSON.stringify(rows) !== JSON.stringify(sourceRows.slice(1)) ||
    fields.line22b_interest !== attachedInterest ||
    fields.line22b_elsewhere !== attachedElsewhere ||
    fields.line22a_elsewhere !== 0 ||
    fields.line23_total_interest !==
      Number(fields.line22a_interest) + attachedInterest ||
    fields.line24_capped_interest !==
      Math.min(Number(fields.line23_total_interest), 10_000)
  ) {
    throw new Error(
      "Schedule 1-A line 22 statement does not reconcile to Part IV",
    );
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = Math.ceil(rows.length / ROWS_PER_PAGE);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const batch = rows.slice(
      pageIndex * ROWS_PER_PAGE,
      (pageIndex + 1) * ROWS_PER_PAGE,
    );
    const page = document.addPage([612, 792]);
    page.drawText("2025 Schedule 1-A, Part IV, line 22 - additional vehicles", {
      x: LEFT,
      y: 748,
      size: 11,
      font: bold,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: LEFT,
      y: 729,
      size: 9,
      font,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: LEFT,
      y: 714,
      size: 9,
      font,
    });
    const columns = [36, 73, 285, 426, 576];
    const headings = [
      "No.",
      "(i) VIN",
      "(ii) Deducted on C/E/F",
      "(iii) Schedule 1-A",
    ];
    headings.forEach((heading, index) =>
      page.drawText(heading, {
        x: columns[index] + 4,
        y: 671,
        size: 8,
        font: bold,
      })
    );
    const top = 690;
    const bodyTop = 651;
    const bottom = bodyTop - batch.length * ROW_HEIGHT;
    for (const x of columns) {
      page.drawLine({
        start: { x, y: top },
        end: { x, y: bottom },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    for (const y of [top, bodyTop]) {
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT, y },
        thickness: 0.5,
      });
    }
    batch.forEach((row, index) => {
      const y = bodyTop - (index + 1) * ROW_HEIGHT;
      page.drawText(String(pageIndex * ROWS_PER_PAGE + index + 2), {
        x: columns[0] + 4,
        y: y + 10,
        size: 9,
        font,
      });
      page.drawText(row.vin, {
        x: columns[1] + 4,
        y: y + 10,
        size: 9,
        font,
      });
      page.drawText("0", {
        x: columns[3] - 12,
        y: y + 10,
        size: 9,
        font,
      });
      const amount = row.schedule1a_interest.toLocaleString("en-US");
      const width = font.widthOfTextAtSize(amount, 9);
      if (width > columns[4] - columns[3] - 8) {
        throw new Error("Schedule 1-A line 22 statement amount is too wide");
      }
      page.drawText(amount, {
        x: columns[4] - 4 - width,
        y: y + 10,
        size: 9,
        font,
      });
      page.drawLine({
        start: { x: LEFT, y },
        end: { x: RIGHT, y },
        thickness: 0.5,
      });
    });
    page.drawText(
      `Attached VINs 2-${rows.length + 1}: ${
        attachedInterest.toLocaleString("en-US")
      } on line 22b, column (iii)`,
      { x: LEFT, y: 65, size: 8, font },
    );
    page.drawText(
      `Line 23 total: ${
        Number(fields.line23_total_interest).toLocaleString("en-US")
      }`,
      { x: LEFT, y: 51, size: 8, font },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pages}`, {
      x: 510,
      y: 51,
      size: 8,
      font,
    });
  }
}
