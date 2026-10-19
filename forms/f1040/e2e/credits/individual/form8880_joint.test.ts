import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

const w2 = (employee_ssn: string) => ({
  employee_ssn,
  box1_wages: 24_000,
  box2_fed_withheld: 1_000,
  box3_ss_wages: 26_000,
  box4_ss_withheld: 1_612,
  box5_medicare_wages: 26_000,
  box6_medicare_withheld: 377,
  box12_entries: [{ code: "D", amount: 2_000 }],
});

// Synthetic joint return: AGI 48,000; each spouse defers 2,000 (W-2 code D).
// 2025 Form 8880: no testing-period distributions entered, so line 4 is 0;
// line 7 = 4,000; AGI 48,000 is in the MFJ 20% band (47,501-51,000), so
// line 10 = 800, below the 1,653 tax on 16,500 taxable income.
test("Form 8880: a joint return without a distribution ledger claims the credit", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-01-01",
      spouse_first_name: "Test",
      spouse_last_name: "Spouse",
      spouse_ssn: "111-22-4444",
      spouse_dob: "1986-01-01",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      spouse_form8880_student_five_months: false,
      spouse_form8880_claimed_as_dependent: false,
    },
    w2: [w2("111-22-3333"), w2("111-22-4444")],
  }, ctx);

  assertEquals(result.diagnostics, []);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line11_agi, 48_000);
  assertEquals(form1040.line16_income_tax, 1_653);
  assertEquals(result.pending.schedule3?.line4_retirement_savings_credit, 800);
  assertEquals(form1040.line22_tax_after_credits, 853);
});

// An incomplete Form 8880 source (no student or dependent answers) must not
// stop Form 1040: the credit is left unclaimed with a warning.
test("Form 8880: missing eligibility answers leave the credit off with a warning", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-01-01",
      spouse_first_name: "Test",
      spouse_last_name: "Spouse",
      spouse_ssn: "111-22-4444",
      spouse_dob: "1986-01-01",
    },
    w2: [w2("111-22-3333"), w2("111-22-4444")],
  }, ctx);

  assertEquals(result.diagnostics, []);
  assertEquals(result.warnings?.length, 1);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line11_agi, 48_000);
  assertEquals(form1040.line22_tax_after_credits, 1_653);
});
