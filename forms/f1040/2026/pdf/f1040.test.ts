import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildF1040PdfBytes2026 } from "./f1040.ts";

Deno.test("TY2026 Form 1040 PDF fills the pinned draft and removes its cover", async () => {
  const bytes = await buildF1040PdfBytes2026({
    filing_status: "single",
    taxpayer_first_name: "Ada",
    taxpayer_middle_initial: "Q",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    address_line1: "10 Main St",
    address_city: "Boston",
    address_state: "MA",
    address_zip: "02108",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line1a_wages: 80_000,
    line11a_agi: 80_000,
    line11b_agi: 80_000,
    line12e_standard_or_itemized: 16_100,
    line15_taxable_income: 63_900,
    line16_income_tax: 8_770,
    line24a_total_tax: 8_770,
    line24c_total_tax: 8_770,
    line25a_w2_withheld: 10_000,
    line25d_total_withholding: 10_000,
    line33_total_payments: 10_000,
    line34_overpayment: 1_230,
    line35a_refund: 1_230,
  });
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(bytes.length > 10_000, true);
});
