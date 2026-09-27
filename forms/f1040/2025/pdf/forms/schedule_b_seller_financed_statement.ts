import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  type SellerFinancedBuyer,
  sellerFinancedBuyerSchema,
} from "../../../seller_financed_buyer.ts";

interface SellerRow {
  buyer: SellerFinancedBuyer;
  amount: number;
}

const ROWS_PER_PAGE = 8;

export async function appendScheduleBSellerFinancedStatement(
  document: PDFDocument,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): Promise<void> {
  const rawRows = fields.seller_financed_rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) return;
  if (!filer) {
    throw new Error("Schedule B seller statement needs filer identity");
  }
  const rows = rawRows as SellerRow[];
  if (
    rows.some((row) =>
      !sellerFinancedBuyerSchema.safeParse(row?.buyer).success ||
      !Number.isFinite(row.amount) || row.amount <= 0
    )
  ) {
    throw new Error("Schedule B seller statement needs complete buyer details");
  }
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageCount = Math.ceil(rows.length / ROWS_PER_PAGE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = document.addPage([612, 792]);
    page.drawText("Schedule B (Form 1040) 2025 - Seller-Financed Interest", {
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
    page.drawText("Schedule B Part I, line 1 - buyer detail", {
      x: 36,
      y: 680,
      size: 9,
      font: bold,
    });
    const first = pageIndex * ROWS_PER_PAGE;
    const last = Math.min(first + ROWS_PER_PAGE, rows.length);
    for (let index = first; index < last; index++) {
      const row = rows[index];
      const y = 650 - (index - first) * 72;
      const address = [row.buyer.address_line1, row.buyer.address_line2]
        .filter(Boolean).join(", ");
      const location = row.buyer.address_type === "us"
        ? `${row.buyer.city}, ${row.buyer.state} ${row.buyer.zip}`
        : [row.buyer.city, row.buyer.province_or_state].filter(Boolean).join(
          ", ",
        );
      page.drawText(`${index + 1}. ${row.buyer.name}  SSN: ${row.buyer.ssn}`, {
        x: 36,
        y,
        size: 9,
        font: bold,
      });
      page.drawText(address, { x: 50, y: y - 17, size: 9, font: regular });
      page.drawText(location, { x: 50, y: y - 34, size: 9, font: regular });
      if (row.buyer.address_type === "foreign") {
        page.drawText(
          [row.buyer.country_code, row.buyer.foreign_postal_code]
            .filter(Boolean).join(" "),
          { x: 50, y: y - 51, size: 9, font: regular },
        );
      }
      page.drawText(`Interest: ${Math.round(row.amount)}`, {
        x: 430,
        y: y - 17,
        size: 9,
        font: regular,
      });
    }
    page.drawText(`Page ${pageIndex + 1} of ${pageCount}`, {
      x: 508,
      y: 55,
      size: 8,
      font: regular,
    });
  }
}
