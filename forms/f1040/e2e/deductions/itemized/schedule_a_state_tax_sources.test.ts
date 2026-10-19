import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";

// 2025 Instructions for Schedule A, line 5a: state and local income taxes are
// those withheld (W-2 box 17) plus estimated payments and prior-year balances
// paid in 2025. Line 5e is limited to $40,000 (MFJ, 2025).
function run(scheduleA: Record<string, number>) {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: "123456789",
      spouse_ssn: "987654321",
      digital_assets: false,
    },
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 50_000,
      box15_state: "CO",
      box17_state_withheld: 500,
      employee_ssn: "123456789",
      employer_ein: "223456789",
    }],
    schedule_a: scheduleA,
  }, { taxYear: 2025, formType: "f1040" });
}

test("W-2 box 17 adds to, not replaces, other state income tax paid", () => {
  const result = run({ line_5a_other_state_income_tax: 58_000 });
  assertEquals(
    result.diagnostics.filter((d) => d.nodeType === "schedule_a"),
    [],
  );
  assertEquals(result.pending.schedule_a?.line_5a_state_income_tax, 58_500);
  // SALT min(58,500, 40,000) = 40,000 beats the 31,500 standard deduction.
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 40_000);
});

test("an entered full line 5a already includes the W-2 withholding", () => {
  const result = run({ line_5a_state_income_tax: 58_500 });
  assertEquals(result.pending.schedule_a?.line_5a_state_income_tax, 58_500);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 40_000);
});

test("an entered line 5a below the W-2 withholding is rejected", () => {
  const result = run({ line_5a_state_income_tax: 400 });
  assertEquals(
    result.diagnostics.some((d) =>
      d.nodeType === "schedule_a" && /less than its W-2/.test(d.message)
    ),
    true,
  );
});
