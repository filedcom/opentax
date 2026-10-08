import { assertEquals, assertThrows } from "@std/assert";
import { agi_aggregator } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
const ctx = { taxYear: 2025, formType: "f1040" };
function fields(
  input: Parameters<typeof agi_aggregator.compute>[1],
  target: string,
) {
  return Object.assign(
    {},
    ...agi_aggregator.compute(ctx, input).outputs.filter((o) =>
      o.nodeType === target
    ).map((o) => o.fields),
  );
}
Deno.test("NOL internal AGI projection reduces total income exactly once", () => {
  const v = { line1a_wages: [30000, 20000], line8a_nol_deduction: 27400 };
  assertEquals(fields(v, "f1040").line11_agi, 22600);
  assertEquals(fields(v, "f1040").line8_additional_income, -27400);
  assertEquals(
    fields({ line1a_wages: 1000, line8a_nol_deduction: 2000 }, "f1040")
      .line11_agi,
    -1000,
  );
});
Deno.test("NOL internal AGI projection refigures student loan phaseout", () => {
  const v = {
    filing_status: "single",
    line1a_wages: 95000,
    line21_student_loan_interest: 2500,
  };
  assertEquals(fields(v, "schedule1").line21_student_loan_interest, 833);
  const after = { ...v, line8a_nol_deduction: 20000 };
  assertEquals(fields(after, "schedule1").line21_student_loan_interest, 2500);
  assertEquals(fields(after, "f1040").line11_agi, 72500);
});
Deno.test("NOL internal AGI projection refigures taxable Social Security", () => {
  const v = {
    filing_status: "single",
    line1a_wages: 30000,
    line6a_ss_gross: 20000,
  };
  assertEquals(fields(v, "f1040").line6b_ss_taxable, 9600);
  assertEquals(
    fields({ ...v, line8a_nol_deduction: 20000 }, "f1040").line11_agi,
    10000,
  );
});
Deno.test("NOL internal AGI projection rejects negative fractional and duplicated deductions", () => {
  for (const n of [-1, 1.5, [1, 2]]) {
    assertThrows(() =>
      agi_aggregator.compute(
        ctx,
        {
          line1a_wages: 50000,
          line8a_nol_deduction: n,
        } as unknown as Parameters<typeof agi_aggregator.compute>[1],
      )
    );
  }
});
