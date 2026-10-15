import { assertEquals, assertThrows } from "@std/assert";
import { schedule1_2026 } from "./schedule1.ts";
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

Deno.test("TY2026 Schedule 1 aggregates repeated sources and preserves signed rounding", () => {
  const result = schedule1_2026.compute(context, {
    line3_schedule_c: -100.50,
    line5_schedule_e: [100.25, 100.25],
    line8z_taxable_grants: 200.49,
    line8z_other: 100.49,
    line8z_description: "Other income",
    line18_early_withdrawal: 10.50,
    agi_schedule1_line10: 400,
    agi_schedule1_line26: 11,
  });
  const filed = result.outputs[0].fields;
  assertEquals(filed.line3_schedule_c, -101);
  assertEquals(filed.line5_schedule_e, 201);
  assertEquals(filed.line8z_total, 300);
  assertEquals(filed.line10_total_additional_income, 400);
  assertEquals(filed.line26_total_adjustments, 11);
});
