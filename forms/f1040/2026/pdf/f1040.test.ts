import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  DependentCreditCategory,
  DependentRelationship,
} from "../../nodes/inputs/general/index.ts";
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
    dependent_count: 0,
    qualifying_child_tax_credit_count: 0,
    other_dependent_count: 0,
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

Deno.test("TY2026 Form 1040 prints four dependent columns and a continuation", async () => {
  const dependents = Array.from({ length: 5 }, (_, index) => ({
    first_name: `Child${index + 1}`,
    last_name: "Rivera",
    ssn: `22233444${index}`,
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    lived_in_us_over_half_year: true,
    credit_category: DependentCreditCategory.None,
  }));
  const bytes = await buildF1040PdfBytes2026({
    filing_status: "single",
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    dependent_count: 5,
    qualifying_child_tax_credit_count: 0,
    other_dependent_count: 0,
    dependent_details: dependents,
  });
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 3);
});
