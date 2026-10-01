import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";
import type { FilerIdentity } from "../../../mef/header.ts";

const rowSchema = z.object({
  employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  employer_name: z.string().trim().min(1),
  amount: z.number().int().positive(),
  reported_amount: z.number().int().nonnegative(),
  form4137_amount: z.number().int().nonnegative(),
  occupation_code: z.string().regex(/^\d{3}$/),
}).strict().refine(
  (row) => row.amount === Math.max(row.reported_amount, row.form4137_amount),
  "Schedule 1-A tips worksheet row needs the greater source amount",
);

export async function appendSchedule1ATipsWorksheet(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  if (fields.pdf_tip_sources === undefined) return;
  const rows = z.array(rowSchema).min(2).parse(
    fields.pdf_tip_sources,
  );
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Schedule 1-A tips worksheet needs filer identity");
  }
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (
    fields.line4a_w2_tips !== 0 ||
    fields.line4b_form4137_tips !== 0 ||
    fields.line4c_employee_tips !== total ||
    fields.line6_total_tips !== total +
        (fields.line5_trade_business_tips as number | undefined ?? 0) ||
    fields.line7_capped_tips !== Math.min(
        total + (fields.line5_trade_business_tips as number | undefined ?? 0),
        25_000,
      )
  ) {
    throw new Error(
      "Schedule 1-A tips worksheet does not reconcile to Part II",
    );
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = Math.ceil(rows.length / 5);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    const batch = rows.slice(pageIndex * 5, (pageIndex + 1) * 5);
    const page = document.addPage([612, 792]);
    page.drawText(
      "2025 Schedule 1-A, line 4c - Qualified Tips From More Than One Employer",
      { x: 36, y: 747, size: 10, font: bold },
    );
    page.drawText("Worksheet - keep for your records", {
      x: 36,
      y: 731,
      size: 9,
      font,
    });
    page.drawText(`Name: ${filer.nameLine1}`, {
      x: 36,
      y: 710,
      size: 9,
      font,
    });
    page.drawText(`SSN: ${filer.primarySSN}`, {
      x: 36,
      y: 696,
      size: 9,
      font,
    });
    const columns = [36, 248, 339, 426, 493, 576];
    const labels = [
      "Employer / EIN / occupation",
      "(b) W-2/4070",
      "(c) 4137",
      "(d) Greater",
      "Employee",
    ];
    labels.forEach((label, index) =>
      page.drawText(label, {
        x: columns[index] + 4,
        y: 658,
        size: 8,
        font: bold,
      })
    );
    const top = 675;
    const bodyTop = 640;
    const rowHeight = 52;
    const bottom = bodyTop - batch.length * rowHeight;
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
        start: { x: 36, y },
        end: { x: 576, y },
        thickness: 0.5,
      });
    }
    batch.forEach((row, index) => {
      font.encodeText(row.employer_name);
      if (font.widthOfTextAtSize(row.employer_name, 8) > 204) {
        throw new Error("Schedule 1-A tips employer name is too wide to print");
      }
      const y = bodyTop - (index + 1) * rowHeight;
      page.drawText(row.employer_name, {
        x: 40,
        y: y + 36,
        size: 8,
        font,
      });
      page.drawText(`${row.employer_ein} / occupation ${row.occupation_code}`, {
        x: 40,
        y: y + 21,
        size: 8,
        font,
      });
      page.drawText(row.reported_amount.toLocaleString("en-US"), {
        x: 252,
        y: y + 32,
        size: 8,
        font,
      });
      page.drawText(row.form4137_amount.toLocaleString("en-US"), {
        x: 343,
        y: y + 32,
        size: 8,
        font,
      });
      page.drawText(row.amount.toLocaleString("en-US"), {
        x: 430,
        y: y + 32,
        size: 8,
        font,
      });
      page.drawText(row.employee_ssn, {
        x: 497,
        y: y + 32,
        size: 8,
        font,
      });
      page.drawLine({
        start: { x: 36, y },
        end: { x: 576, y },
        thickness: 0.5,
      });
    });
    page.drawText(
      `Line 2: ${total.toLocaleString("en-US")} to Schedule 1-A line 4c`,
      { x: 36, y: bottom - 25, size: 9, font: bold },
    );
    page.drawText(`Page ${pageIndex + 1} of ${pages}`, {
      x: 510,
      y: bottom - 25,
      size: 8,
      font,
    });
  }
}
