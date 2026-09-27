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
