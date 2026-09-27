import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";

const adjustments = [
  ["interest_nominee", "Nominee distribution"],
  ["interest_accrued", "Accrued interest"],
  ["interest_oid_adjustment", "OID adjustment"],
  ["interest_bond_premium", "ABP adjustment"],
] as const;

export async function appendScheduleBInterestAdjustmentsStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const nonzero = adjustments.filter(([key]) =>
    typeof fields[key] === "number" && (fields[key] as number) > 0
  );
  if (nonzero.length === 0) return;
  if (!filer) {
    throw new Error("Schedule B adjustment statement needs filer identity");
  }
  const gross = fields.interest_line1_subtotal;
  const net = fields.print_line2_total;
  if (typeof gross !== "number" || typeof net !== "number") {
    throw new Error("Schedule B adjustment statement needs lines 1 and 2");
  }
  const deduction = nonzero.reduce(
    (sum, [key]) => sum + (fields[key] as number),
    0,
  );
  if (
    !Number.isFinite(gross) || !Number.isFinite(net) ||
    Math.abs(gross - deduction - net) > 0.000001
  ) {
    throw new Error("Schedule B adjustment statement does not reconcile");
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([612, 792]);
  page.drawText("Schedule B (Form 1040) 2025 - Interest Adjustments", {
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
  page.drawText("Schedule B Part I, lines 1 and 2", {
    x: 36,
    y: 680,
    size: 9,
    font: bold,
  });
  page.drawText("Interest subtotal, line 1", {
    x: 36,
    y: 650,
    size: 9,
    font: regular,
  });
  page.drawText(String(Math.round(gross)), {
    x: 500,
    y: 650,
    size: 9,
    font: regular,
  });
  nonzero.forEach(([key, label], index) => {
    const y = 625 - index * 25;
    page.drawText(label, { x: 36, y, size: 9, font: regular });
    page.drawText(`(${Math.round(fields[key] as number)})`, {
      x: 490,
      y,
      size: 9,
      font: regular,
    });
  });
  const totalY = 625 - nonzero.length * 25 - 10;
  page.drawText("Taxable interest subtotal, line 2", {
    x: 36,
    y: totalY,
    size: 9,
    font: bold,
  });
  page.drawText(String(Math.round(net)), {
    x: 500,
    y: totalY,
    size: 9,
    font: bold,
  });
}
