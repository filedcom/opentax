import { assertEquals, assertThrows } from "@std/assert";
import { ssa1099_2026, ssa1099Item2026Schema } from "./ssa1099.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 RRB withholding uses box 10 rather than SSA box 6", () => {
  assertEquals(
    ssa1099Item2026Schema.safeParse({
      statement_type: "rrb1099",
      box3_gross_benefits: 100,
      box4_repaid: 0,
      box5_net_benefits: 100,
      box6_federal_withheld: 10,
    }).success,
    false,
  );
  const result = ssa1099_2026.compute(context, {
    statements: [{
      statement_type: "rrb1099",
      box3_gross_benefits: 100,
      box4_repaid: 0,
      box5_net_benefits: 100,
      box10_federal_withheld: 10,
    }],
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields,
    {
      line6a_ss_gross: 100,
      line25b_withheld_1099: 10,
    },
  );
});

Deno.test("TY2026 SSA benefits reject mismatched net and unsupported net repayment", () => {
  assertThrows(
    () =>
      ssa1099_2026.compute(context, {
        statements: [{
          statement_type: "ssa1099",
          box3_gross_benefits: 100,
          box4_repaid: 10,
          box5_net_benefits: 100,
        }],
      }),
    Error,
    "box 5 disagrees",
  );
  assertThrows(
    () =>
      ssa1099_2026.compute(context, {
        statements: [{
          statement_type: "ssa1099",
          box3_gross_benefits: 100,
          box4_repaid: 200,
          box5_net_benefits: -100,
        }],
      }),
    Error,
    "repayment deduction",
  );
});

Deno.test("TY2026 SSA box reconciliation accepts cent amounts", () => {
  const result = ssa1099_2026.compute(context, {
    statements: [{
      statement_type: "ssa1099",
      box3_gross_benefits: 100.10,
      box4_repaid: 0.05,
      box5_net_benefits: 100.05,
    }],
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")?.fields
      .line6a_ss_gross,
    100.05,
  );
});
