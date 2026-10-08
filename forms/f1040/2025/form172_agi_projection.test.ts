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

import { form6251 } from "../nodes/intermediate/forms/form6251/index.ts";
import { FilingStatus } from "../nodes/types.ts";
Deno.test("NOL tentative AMT adds regular deduction once without supplying an ATNOLD", () => {
  const input = form6251.inputSchema.parse({
    filing_status: FilingStatus.Single,
    regular_tax_income: 190250,
    regular_tax: 50000,
    line2a_taxes_paid: 15750,
    line2e_regular_nol: 44000,
  });
  const result = form6251.compute(ctx, input);
  const amti = result.outputs.find((o) => o.nodeType === "form6251")!.fields;
  assertEquals(amti.amti, 250000);
  assertEquals(amti.taxable_excess, 161900);
  assertEquals(amti.tentative_tax, 42094);
  assertEquals(amti.line2e_regular_nol, 44000);
  assertEquals(amti.nol_adjustment, undefined);
  assertEquals(amti.line11_amt, 0);
});
Deno.test("NOL tentative AMT preserves before-exemption AMTI even when no tax is owed", () => {
  const input = form6251.inputSchema.parse({
    filing_status: FilingStatus.Single,
    regular_tax_income: 6850,
    regular_tax: 700,
    line2a_taxes_paid: 15750,
    line2e_regular_nol: 27400,
  });
  const result = form6251.compute(ctx, input);
  const amti = result.outputs.find((o) => o.nodeType === "form6251")!.fields;
  assertEquals(amti.amti, 50000);
  assertEquals(amti.taxable_excess, 0);
  assertEquals(amti.tentative_tax, 0);
  assertEquals(amti.line11_amt, 0);
  for (const line2e_regular_nol of [-1, 1.5, [1, 2], 1_000_000_001]) {
    assertThrows(() =>
      form6251.inputSchema.parse({ ...input, line2e_regular_nol })
    );
  }
  assertThrows(
    () => form6251.compute(ctx, { ...input, nol_adjustment: -45000 }),
    Error,
    "line 2f",
  );
});

Deno.test("NOL tentative AMT records the filed component sum before MFS line4 addition", () => {
  const input = form6251.inputSchema.parse({
    filing_status: FilingStatus.MFS,
    regular_tax_income: 990250.4,
    regular_tax: 300000,
    line2a_taxes_paid: 15750,
    line2e_regular_nol: 44000,
  });
  const result = form6251.compute(ctx, input);
  const form = result.outputs.find((o) => o.nodeType === "form6251")!.fields;
  assertEquals(form.amti_before_mfs_addition, 1050000);
  assertEquals(form.amti, 1087413);
});
