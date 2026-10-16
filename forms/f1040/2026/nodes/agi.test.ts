import { assertEquals, assertThrows } from "@std/assert";
import { agi_2026 } from "./agi.ts";
import { FilingStatus } from "../../nodes/types.ts";
const context = { taxYear: 2026, formType: "f1040" };
function totals(input: Parameters<typeof agi_2026.compute>[1]) {
  const outputs = agi_2026.compute(context, input).outputs;
  return {
    return: outputs.filter((row) => row.nodeType === "f1040").reduce(
      (all, row) => ({ ...all, ...row.fields }),
      {} as Record<string, unknown>,
    ),
    schedule: outputs.filter((row) => row.nodeType === "schedule1").reduce(
      (all, row) => ({ ...all, ...row.fields }),
      {} as Record<string, unknown>,
    ),
  };
}
Deno.test("2026 AGI uses current joint student-loan phaseout and bridges Schedule 1", () => {
  for (
    const [income, deduction] of [[175_000, 2_500], [190_000, 1_250], [
      205_000,
      0,
    ]]
  ) {
    const result = totals({
      filing_status: FilingStatus.MFJ,
      line1a_wages: income,
      line21_student_loan_interest: 2_500,
    });
    assertEquals(result.return.line9_total_income, income);
    assertEquals(result.return.line10_adjustments ?? 0, deduction);
    assertEquals(result.return.line11_agi, undefined);
    assertEquals(result.schedule.agi_schedule1_line26, deduction);
    assertEquals(
      result.schedule.line21_student_loan_interest_from_agi,
      deduction,
    );
  }
});
Deno.test("2026 AGI reconciles signed printed income and adjustment operands", () => {
  const result = totals({
    filing_status: FilingStatus.Single,
    line1a_wages: [70_000.25, 30_000.25],
    line3_schedule_c: -100.5,
    line18_early_withdrawal: 10.5,
  });
  assertEquals(result.return.line9_total_income, 99_900);
  assertEquals(result.return.line8_additional_income, -101);
  assertEquals(result.schedule.agi_schedule1_line10, -101);
  assertEquals(result.schedule.agi_schedule1_line26, 11);
});
Deno.test("2026 AGI rejects unaudited legacy deductions and invalid input", () => {
  assertThrows(
    () =>
      agi_2026.compute(
        context,
        {
          filing_status: FilingStatus.Single,
          line13_depreciation: 500,
        } as never,
      ),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () =>
      agi_2026.compute(context, {
        filing_status: FilingStatus.Single,
        line1a_wages: Infinity,
      }),
    Error,
    "finite",
  );
  assertThrows(
    () =>
      agi_2026.compute(context, {
        filing_status: FilingStatus.Single,
        line21_student_loan_interest: 2_501,
      }),
    Error,
    "capped",
  );
});
