import { assertEquals, assertThrows } from "@std/assert";
import { credit_resolution_2026 } from "./credit_resolution.ts";
import { schedule3_2026 } from "./schedule3.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 Schedule 3 sends refundable and nonrefundable totals to Form 1040", () => {
  const result = schedule3_2026.compute(context, {
    line1_foreign_tax_1099: [75, 45],
    line6c_adoption_credit: 500,
    line10_amount_paid_extension: 1_000,
    line11_excess_ss: 200,
    line13e_form1062: 300,
  });
  const schedule =
    result.outputs.find((output) => output.nodeType === "schedule3")!.fields;
  const creditInput =
    result.outputs.find((output) => output.nodeType === "credit_resolution")!
      .fields;
  const credit = credit_resolution_2026.compute(context, creditInput);
  const f1040 =
    credit.outputs.find((output) => output.nodeType === "f1040")!.fields;
  const f8812 =
    credit.outputs.find((output) => output.nodeType === "f8812")!.fields;
  assertEquals(schedule.line1_total, 120);
  assertEquals(schedule.line7_total, 500);
  assertEquals(schedule.line8_total, 620);
  assertEquals(schedule.line14_total, 300);
  assertEquals(schedule.line15_total, 1_500);
  assertEquals(f1040.line20_nonrefundable_credits, 620);
  assertEquals(f1040.line31_other_payments, 1_500);
  assertEquals(
    (f8812.auto_schedule3_credit_lines as Record<string, unknown>)
      .schedule3_line1,
    120,
  );
});

Deno.test("TY2026 Schedule 3 rejects the reserved 2025 line 5b", () => {
  assertThrows(
    () =>
      schedule3_2026.compute(context, {
        line5b_energy_efficient_home: 100,
      } as never),
    Error,
    "Unrecognized key",
  );
});

Deno.test("TY2026 Schedule 3 reserves line 5a for calculated Form 5695", () => {
  assertThrows(
    () =>
      schedule3_2026.compute(context, {
        line5a_residential_clean_energy: 100,
      } as never),
    Error,
    "Unrecognized key",
  );
});
