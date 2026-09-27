import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import type { NodeRegistry } from "../../../../core/types/node-registry.ts";
import { buildStartNode } from "../../start.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "./f1040.ts";
import { schedule3a } from "./schedule3a.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("TY2026 1040 preserves income sources and computes printed wage and gain lines", () => {
  const result = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 52_200,
    deduction_method: "standard",
    line1a_wages: [40_000, 5_000],
    line1b_household_wages: 1_000,
    line1c_unreported_tips: 200,
    line2a_tax_exempt: 300,
    line2b_taxable_interest: 400,
    line3a_qualified_dividends: [100, 200],
    line3b_ordinary_dividends: [500, 100],
    line4a_ira_gross: 2_000,
    line4b_ira_taxable: 1_000,
    line5a_pension_gross: 2_000,
    line5b_pension_taxable: 1_000,
    line6a_ss_gross: 4_000,
    line6b_ss_taxable: 2_000,
    line7_capital_gain: 900,
    line7a_cap_gain_distrib: 100,
  });
  const fields =
    result.outputs.find((output) => output.nodeType === "f1040")!.fields;
  assertEquals(fields.line1a_wages, 45_000);
  assertEquals(fields.line1z_total_wages, 46_200);
  assertEquals(fields.line2a_tax_exempt, 300);
  assertEquals(fields.line2b_taxable_interest, 400);
  assertEquals(fields.line3a_qualified_dividends, 300);
  assertEquals(fields.line3b_ordinary_dividends, 600);
  assertEquals(fields.line4a_ira_gross, 2_000);
  assertEquals(fields.line5b_pension_taxable, 1_000);
  assertEquals(fields.line6a_ss_gross, 4_000);
  assertEquals(fields.line7a_capital_gain, 1_000);
});

Deno.test("TY2026 1040 assembles deductions, Form 1062, and payments", () => {
  const result = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 80_000,
    deduction_method: "standard",
    standard_deduction: 16_100,
    nonitemizer_cash_contributions: 1_000,
    schedule1a_line44: 3_000,
    qbi_deduction: 2_000,
    line16_income_tax: 10_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 1_000,
    line23_other_taxes: 500,
    form1062_line15: 250,
    line25a_w2_withheld: 4_000,
    line25b_withheld_1099: 750,
    line25c_other_withheld: 250,
    line26_estimated_payments: 1_000,
    line27a_eic: 2_000,
    line28_actc: 1_000,
    line31_other_payments: 200,
    schedule2_line20: 100,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  assertEquals(f1040.fields.line12e_standard_or_itemized, 16_100);
  assertEquals(f1040.fields.line12f_nonitemizer_charity, 1_000);
  assertEquals(f1040.fields.line13a_schedule1a, 3_000);
  assertEquals(f1040.fields.line13b_qbi, 2_000);
  assertEquals(f1040.fields.line14_total_deductions, 22_100);
  assertEquals(f1040.fields.line15_taxable_income, 57_900);
  assertEquals(f1040.fields.line11a_agi, 80_000);
  assertEquals(f1040.fields.line11b_agi, 80_000);
  assertEquals(f1040.fields.line25d_total_withholding, 5_000);
  assertEquals(f1040.fields.line24a_total_tax, 7_500);
  assertEquals(f1040.fields.line24b_form1062, 250);
  assertEquals(f1040.fields.line24c_total_tax, 7_750);
  assertEquals(f1040.fields.line32a_refundable_credits, 3_200);
  assertEquals(f1040.fields.line32b_public_benefit_reduction, 0);
  assertEquals(f1040.fields.line32c_net_refundable_credits, 3_200);
  assertEquals(f1040.fields.line33_total_payments, 9_200);
  assertEquals(f1040.fields.line34_overpayment, 1_450);
  assertEquals(f1040.fields.line35a_refund, 1_450);
  assertEquals(f1040.fields.line37_amount_owed, 0);
  assertEquals("line24_total_tax" in f1040.fields, false);
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule3a"),
    true,
  );
});

Deno.test("TY2026 1040 rejects unfinalized Schedule 2 credit-limit tax", () => {
  assertThrows(
    () =>
      f1040_2026_node.compute(context, {
        filing_status: FilingStatus.Single,
        line9_total_income: 80_000,
        deduction_method: "standard",
        credit_limit_schedule2_line1z: 100,
      }),
    Error,
    "credit finalization path",
  );
});

Deno.test("TY2026 1040 rejects credit dependents until Schedule 8812 is finalized", () => {
  assertThrows(
    () =>
      f1040_2026_node.compute(context, {
        filing_status: FilingStatus.Single,
        line9_total_income: 80_000,
        deduction_method: "standard",
        dependent_count: 1,
        qualifying_child_tax_credit_count: 1,
      }),
    Error,
    "child-credit finalization path",
  );
});

Deno.test("TY2026 1040 allocates refund and rejects declining a claimed EIC", () => {
  const base = {
    filing_status: FilingStatus.Single,
    line9_total_income: 20_000,
    deduction_method: "standard" as const,
    line25a_w2_withheld: 2_000,
    line36_apply_to_2027: 500,
  };
  const result = f1040_2026_node.compute(context, base);
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  assertEquals(f1040.fields.line34_overpayment, 2_000);
  assertEquals(f1040.fields.line35a_refund, 1_500);
  assertEquals(f1040.fields.line36_apply_to_2027, 500);
  assertThrows(
    () =>
      f1040_2026_node.compute(context, {
        ...base,
        line27a_eic: 100,
        line27c_declines_eic: true,
      }),
    Error,
    "cannot decline",
  );
});

Deno.test("TY2026 1040 emits Schedule 3-A and reduces a declined benefit", () => {
  const result = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 20_000,
    deduction_method: "itemized",
    itemized_deductions: 3_000,
    line16_income_tax: 500,
    line27a_eic: 1_000,
    schedule2_line20: 100,
    wants_federal_public_benefit: false,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  const schedule = result.outputs.find((output) =>
    output.nodeType === "schedule3a"
  )!;
  assertEquals(f1040.fields.line12f_nonitemizer_charity, 0);
  assertEquals(f1040.fields.line32b_public_benefit_reduction, 600);
  assertEquals(f1040.fields.line32c_net_refundable_credits, 400);
  assertEquals(f1040.fields.line37_amount_owed, 100);
  assertEquals(schedule.fields.line6_federal_public_benefit, 600);
  assertEquals(schedule.fields.line7_wants_benefit, false);
  assertEquals(
    schedule3a.inputSchema.parse(schedule.fields).line6_federal_public_benefit,
    600,
  );
});

Deno.test("TY2026 1040 requires Schedule 3-A answers and rejects 2025 fields", () => {
  const base = {
    filing_status: FilingStatus.Single,
    line9_total_income: 20_000,
    deduction_method: "standard" as const,
    line16_income_tax: 500,
    line27a_eic: 1_000,
  };
  assertThrows(
    () => f1040_2026_node.compute(context, base),
    Error,
    "Schedule 3-A line 7 election is required",
  );
  assertThrows(
    () =>
      f1040_2026_node.compute(context, {
        ...base,
        wants_federal_public_benefit: true,
      }),
    Error,
    "Schedule 3-A line 8 eligibility is required",
  );
  assertThrows(
    () => f1040_2026_node.inputSchema.parse({ ...base, line24_total_tax: 500 }),
    Error,
  );
  assertThrows(
    () => f1040_2026_node.compute({ taxYear: 2025, formType: "f1040" }, base),
    Error,
    "requires f1040:2026 context",
  );
});

Deno.test("TY2026 core nodes execute in graph order with Schedule 3-A", () => {
  const start = buildStartNode([{
    node: f1040_2026_node,
    inputSchema: f1040_2026_node.inputSchema,
    isArray: false,
  }]);
  const registry: NodeRegistry = { start, f1040: f1040_2026_node, schedule3a };
  const result = execute(buildExecutionPlan(registry), registry, {
    f1040: {
      filing_status: FilingStatus.Single,
      line9_total_income: 20_000,
      deduction_method: "standard",
      line16_income_tax: 500,
      line27a_eic: 1_000,
      wants_federal_public_benefit: false,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line32b_public_benefit_reduction, 500);
  assertEquals(result.pending.schedule3a.line6_federal_public_benefit, 500);
});
