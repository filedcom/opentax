import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { registry } from "../registry.ts";
import { buildPdfBytes2026 } from "./builder.ts";

const filer = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1990-07-12",
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  address_line1: "10 Main St",
  address_city: "Boston",
  address_state: "MA",
  address_zip: "02108",
};

Deno.test("TY2026 PDF boundary selects filed attachments from graph pending", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
    f1099int: [{ payer_name: "Test Bank", box1: 2_000, box2: 100 }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 PDF boundary includes Form 8960 for investment income tax", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 50_000 }],
    f1099int: [{ payer_name: "Test Bank", box1: 10_000 }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 6);
  await assertRejects(
    () =>
      buildPdfBytes2026({
        ...result.pending,
        form8960: { ...result.pending.form8960, line17_niit: 0 },
      }),
    Error,
    "Form 8960 disagrees with Schedule 2",
  );
  await assertRejects(
    () =>
      buildPdfBytes2026({
        ...result.pending,
        form8960: {
          ...result.pending.form8960,
          line8_total_investment_income: 1,
        },
      }),
    Error,
    "Form 8960 PDF lines do not reconcile",
  );
});

Deno.test("TY2026 PDF boundary includes Form 4137 when tip deduction phases out", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 400_000,
      box2_fed_withheld: 80_000,
      box3_ss_wages: 184_500,
      box8_allocated_tips: 1_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 3_000,
          tipped_occupation_codes: ["102"],
        }],
        ss_wages_from_w2: 184_500,
      }],
    },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule1a.line44_total_additional_deductions,
    undefined,
  );
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 PDF boundary includes Schedule 1-A tip and Form 4137 pages", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 70_000,
      box2_fed_withheld: 6_000,
      box3_ss_wages: 70_000,
      box8_allocated_tips: 1_000,
      box12_entries: [{ code: "TP", amount: 3_000 }],
      box14b_tipped_codes: ["102"],
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 3_000,
        }],
        ss_wages_from_w2: 70_000,
      }],
    },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line15_qualified_tips, 5_000);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 8);
});

Deno.test("TY2026 PDF boundary includes Schedule 1-A senior deduction", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { ...filer, taxpayer_dob: "1950-07-12" },
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 5_000 }],
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line43_enhanced_senior, 6_000);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 PDF boundary includes Schedule 1-A W-2 overtime", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 80_000,
      box2_fed_withheld: 8_000,
      box12_entries: [{ code: "TT", amount: 5_000 }],
    }],
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line27_qualified_overtime, 5_000);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 PDF boundary includes Schedule 1-A non-W-2 overtime", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 5_000 }],
    schedule1a: {
      non_w2_qualified_overtime_rows_2026: [{
        recipient: "taxpayer",
        business_name: "Consulting",
        business_ein: "12-3456789",
        payer_tin: "98-7654321",
        amount: 1_000,
      }],
    },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line27_qualified_overtime, 1_000);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 PDF boundary includes Schedule 1-A vehicle interest", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 5_000 }],
    schedule1a: {
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 2_000,
        interest_deducted_on_business_schedules: 500,
        original_use_started_with_filer: true,
        final_assembly_us: true,
      }],
    },
  }, { taxYear: 2026, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line36_vehicle_loan_interest, 1_500);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
});
