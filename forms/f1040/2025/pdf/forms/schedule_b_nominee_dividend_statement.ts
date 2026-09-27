import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

export async function appendScheduleBNomineeDividendStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const nominee = fields.dividend_nominee;
  if (typeof nominee !== "number" || nominee <= 0) return;
  if (!filer) {
    throw new Error(
      "Schedule B nominee dividend statement needs filer identity",
    );
  }
  const gross = fields.dividend_line5_subtotal;
  const net = fields.print_line6_total;
  if (
    typeof gross !== "number" || typeof net !== "number" ||
    !Number.isFinite(gross) || !Number.isFinite(net) ||
    Math.abs(gross - nominee - net) > 0.000001
  ) {
    throw new Error("Schedule B nominee dividends do not reconcile");
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([612, 792]);
  page.drawText("Schedule B (Form 1040) 2025 - Nominee Dividends", {
    x: 36,
    y: 748,
    size: 11,
    font: bold,
  });
  page.drawText(`Name: ${filer.nameLine1}`, {
    x: 36,
    y: 728,
    size: 9,
    font: regular,
  });
  page.drawText(`SSN: ${filer.primarySSN}`, {
    x: 36,
    y: 711,
    size: 9,
    font: regular,
  });
  page.drawText("Schedule B Part II, lines 5 and 6", {
    x: 36,
    y: 680,
    size: 9,
    font: bold,
  });
  const lines: readonly [string, number][] = [
    ["Ordinary dividend subtotal, line 5", gross],
    ["Nominee distribution", -nominee],
    ["Taxpayer ordinary dividends, line 6", net],
  ];
  lines.forEach(([label, amount], index) => {
    const y = 650 - index * 25;
    page.drawText(label, {
      x: 36,
      y,
      size: 9,
      font: index === 2 ? bold : regular,
    });
    page.drawText(String(Math.round(amount)), {
      x: 490,
      y,
      size: 9,
      font: index === 2 ? bold : regular,
    });
  });
}
