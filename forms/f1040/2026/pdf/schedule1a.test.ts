import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import { buildSchedule1APdfBytes2026 } from "./schedule1a.ts";

const filer = { name: "Ada Rivera", ssn: "111223333" };
const base = {
  filing_status: FilingStatus.Single,
  taxpayer_ssn: filer.ssn,
  taxpayer_has_valid_ssn: true,
  spouse_has_valid_ssn: false,
  magi: 72_000,
  line15_qualified_tips: 0,
  line27_qualified_overtime: 0,
  line36_vehicle_loan_interest: 0,
  line43_enhanced_senior: 0,
  line44_total_additional_deductions: 0,
};

Deno.test("TY2026 Schedule 1-A PDF continues employee tips beyond five rows", async () => {
  const sources = Array.from({ length: 6 }, (_, index) => ({
    source: "w2" as const,
    employer_ein: `12345678${index}`,
    employer_name: `Cafe ${index + 1}`,
    employee_ssn: filer.ssn,
    amount: 500,
    occupation_codes: ["102"],
  }));
  const pdf = await PDFDocument.load(
    await buildSchedule1APdfBytes2026(
      {
        ...base,
        qualified_employee_tip_sources_2026: sources,
        line15_qualified_tips: 3_000,
        line44_total_additional_deductions: 3_000,
      },
      { line11b_agi: 72_000, line13a_schedule1a: 3_000 },
      filer,
    ),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 Schedule 1-A PDF continues W-2 overtime beyond five rows", async () => {
  const sources = Array.from({ length: 6 }, (_, index) => ({
    employee_ssn: filer.ssn,
    employer_ein: `12345678${index}`,
    employer_name: `Cafe ${index + 1}`,
    amount: 500,
  }));
  const pdf = await PDFDocument.load(
    await buildSchedule1APdfBytes2026(
      {
        ...base,
        qualified_employee_overtime: sources,
        line27_qualified_overtime: 3_000,
        line44_total_additional_deductions: 3_000,
      },
      { line11b_agi: 72_000, line13a_schedule1a: 3_000 },
      filer,
    ),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 Schedule 1-A PDF continues non-W-2 overtime beyond five rows", async () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({
    recipient: "taxpayer" as const,
    business_name: `Business ${index + 1}`,
    business_ein: `12345678${index}`,
    payer_tin: `98765432${index}`,
    amount: 500,
  }));
  const pdf = await PDFDocument.load(
    await buildSchedule1APdfBytes2026(
      {
        ...base,
        non_w2_qualified_overtime_rows_2026: rows,
        line27_qualified_overtime: 3_000,
        line44_total_additional_deductions: 3_000,
      },
      { line11b_agi: 72_000, line13a_schedule1a: 3_000 },
      filer,
    ),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 Schedule 1-A PDF continues vehicle interest beyond two VINs", async () => {
  const loans = ["1HGCM82633A004352", "1HGCM82633A004353", "1HGCM82633A004354"]
    .map((vin) => ({
      vin,
      qualified_interest_paid: 1_000,
      original_use_started_with_filer: true,
      final_assembly_us: true,
    }));
  const pdf = await PDFDocument.load(
    await buildSchedule1APdfBytes2026(
      {
        ...base,
        vehicle_loans: loans,
        line36_vehicle_loan_interest: 3_000,
        line44_total_additional_deductions: 3_000,
      },
      { line11b_agi: 72_000, line13a_schedule1a: 3_000 },
      filer,
    ),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 Schedule 1-A PDF rejects unsupported source detail", async () => {
  await assertRejects(
    () =>
      buildSchedule1APdfBytes2026(
        {
          ...base,
          vehicle_loans: [{
            vin: "1HGCM82633A004352",
            qualified_interest_paid: 1_000,
          }],
          line36_vehicle_loan_interest: 1_000,
          line44_total_additional_deductions: 1_000,
        },
        { line11b_agi: 72_000, line13a_schedule1a: 1_000 },
        filer,
      ),
    Error,
    "needs vehicle eligibility answers",
  );
  await assertRejects(
    () =>
      buildSchedule1APdfBytes2026(
        {
          ...base,
          taxpayer_non_w2_qualified_overtime_compensation: 500,
          line27_qualified_overtime: 500,
          line44_total_additional_deductions: 500,
        },
        { line11b_agi: 72_000, line13a_schedule1a: 500 },
        filer,
      ),
    Error,
    "needs non-W-2 overtime business and payer details",
  );
  await assertRejects(
    () =>
      buildSchedule1APdfBytes2026(
        {
          ...base,
          taxpayer_age_65_or_older: true,
          line43_enhanced_senior: 6_000,
          line44_total_additional_deductions: 6_000,
        },
        { line11b_agi: 70_000, line13a_schedule1a: 6_000 },
        filer,
      ),
    Error,
    "needs MAGI addback details",
  );
});
