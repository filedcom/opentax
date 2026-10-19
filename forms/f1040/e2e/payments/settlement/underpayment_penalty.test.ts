import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

test("Form 2210: computes the regular-method penalty and adds it to amount owed", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 200_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 200_000,
      box6_medicare_withheld: 2_900,
      box12_entries: [],
    }],
    f2210: {
      withholding: 0,
      prior_year_tax: 30_000,
      prior_year_agi: 180_000,
    },
  }, ctx);

  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line24_total_tax, 37_067);
  assertEquals(form1040.line38_underpayment_penalty, 1_536);
  assertEquals(form1040.line37_amount_owed, 38_603);
});

test("Form 2210: explicit penalty is reported and added to amount owed", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 100_000,
      box2_fed_withheld: 10_000,
      box3_ss_wages: 100_000,
      box4_ss_withheld: 6_200,
      box5_medicare_wages: 100_000,
      box6_medicare_withheld: 1_450,
      box12_entries: [],
    }],
    f2210: { underpayment_penalty: 250 },
  }, ctx);

  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line38_underpayment_penalty, 250);
  assertEquals(
    form1040.line37_amount_owed,
    Math.max(0, Math.round(form1040.line24_total_tax as number) - 10_000) + 250,
  );
});

// Synthetic joint return: taxable income 82,325 (113,825 wages less the
// 31,500 standard deduction) gives line 24 tax of 9,402 with no withholding.
// The four 2,400 Form 1040-ES payments are applied by date; the penalty is
// worked by hand in f2210/calculation.test.ts from the 2025 Instructions for
// Form 2210 (Part III Section A and the penalty worksheet): $4.
test("Form 2210: late Form 1040-ES payments are applied by their dates", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
      spouse_first_name: "Test",
      spouse_last_name: "Spouse",
    },
    w2: [{
      box1_wages: 113_825,
      box2_fed_withheld: 0,
      box3_ss_wages: 113_825,
      box4_ss_withheld: 7_057.15,
      box5_medicare_wages: 113_825,
      box6_medicare_withheld: 1_650.46,
      box12_entries: [],
    }],
    f1040es: {
      payment_q1: 2_400,
      payment_q1_date: "2025-04-19",
      payment_q2: 2_400,
      payment_q2_date: "2025-06-17",
      payment_q3: 2_400,
      payment_q3_date: "2025-09-22",
      payment_q4: 2_400,
      payment_q4_date: "2026-01-15",
    },
    f2210: { prior_year_tax: 9_343, prior_year_agi: 115_177 },
  }, ctx);

  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line24_total_tax, 9_402);
  assertEquals(form1040.line33_total_payments, 9_600);
  assertEquals(form1040.line34_overpayment, 198);
  // Form 1040 instructions, line 38: the penalty reduces the overpayment.
  assertEquals(form1040.line38_underpayment_penalty, 4);
  assertEquals(form1040.line35a_refund, 194);
});
