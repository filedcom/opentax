import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import type { InputNodeEntry } from "../../../../core/types/form-definition.ts";
import { buildStartNode } from "../../start.ts";
import {
  f1099int,
  itemSchema as f1099intItemSchema,
} from "../../nodes/inputs/f1099int/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { inputNodes } from "../inputs.ts";
import { registry } from "../registry.ts";
import { buildCorePdfBytes2026 } from "../pdf/core.ts";
import { schedule1_2026 } from "./schedule1.ts";
import { schedule_b_2026 } from "./schedule_b.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 Schedule 1 maps box 2 penalty and adjusted student loan interest", () => {
  const result = schedule1_2026.compute(context, {
    line18_early_withdrawal: 100,
    line19_student_loan_interest: 2_000,
    line21_student_loan_interest_from_agi: 1_500,
    agi_schedule1_line10: 0,
    agi_schedule1_line26: 1_600,
  });
  const filed = result.outputs[0].fields;
  assertEquals(filed.line18_early_withdrawal, 100);
  assertEquals(filed.line21_student_loan_interest, 1_500);
  assertEquals(filed.line26_total_adjustments, 1_600);
  assertThrows(
    () =>
      schedule1_2026.compute(context, {
        line13_depreciation: 500,
      }),
    Error,
    "cannot place legacy source",
  );
  assertThrows(
    () =>
      schedule1_2026.compute(context, {
        line18_early_withdrawal: 100,
        agi_schedule1_line10: 0,
        agi_schedule1_line26: 99,
      }),
    Error,
    "disagrees with AGI totals",
  );
});

Deno.test("TY2026 1099-INT box 2 reaches Schedule 1, 1040 AGI, and PDF", async () => {
  const directInputs: readonly InputNodeEntry[] = [
    ...inputNodes,
    { node: f1099int, itemSchema: f1099intItemSchema, isArray: true },
    {
      node: schedule_b_2026,
      inputSchema: schedule_b_2026.inputSchema.pick({
        foreign_account: true,
        fbar_required: true,
        foreign_countries: true,
        foreign_trust: true,
      }),
      isArray: false,
    },
  ];
  const graph = { ...registry, start: buildStartNode(directInputs), f1099int };
  const result = execute(buildExecutionPlan(graph), graph, {
    general: {
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
    },
    f1099int: [{ payer_name: "Test Bank", box1: 2_000, box2: 100 }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line18_early_withdrawal, 100);
  assertEquals(result.pending.schedule1.line26_total_adjustments, 100);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 2_000);
  assertEquals(result.pending.f1040.line10_adjustments, 100);
  assertEquals(result.pending.f1040.line11b_agi, 1_900);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
      scheduleB: result.pending.schedule_b,
    }),
  );
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 registered 1098-E prints the phased-out deduction on line 21", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
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
    },
    w2: [{ box1_wages: 90_000, box2_fed_withheld: 10_000 }],
    f1098e: [{ box1_student_loan_interest: 2_500 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line21_student_loan_interest, 1_667);
  assertEquals(result.pending.schedule1.line26_total_adjustments, 1_667);
  assertEquals(result.pending.f1040.line10_adjustments, 1_667);
  assertEquals(result.pending.f1040.line11b_agi, 88_333);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);
});
