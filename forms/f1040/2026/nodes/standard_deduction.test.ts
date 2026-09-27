import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import type { NodeRegistry } from "../../../../core/types/node-registry.ts";
import { buildStartNode } from "../../2025/start.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1a } from "../../nodes/intermediate/forms/schedule1a/index.ts";
import { form4137 } from "../../nodes/intermediate/forms/form4137/index.ts";
import { schedule2 } from "../../nodes/intermediate/aggregation/schedule2/index.ts";
import { w2, w2ItemSchema } from "../../nodes/inputs/w2/index.ts";
import { income_tax_calculation } from "../../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "./f1040.ts";
import { schedule3a } from "./schedule3a.ts";
import { standard_deduction_2026 } from "./standard_deduction.ts";

const context = { taxYear: 2026, formType: "f1040" };

Deno.test("2026 deduction node routes nonitemizer charity and taxable income", () => {
  const result = standard_deduction_2026.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 82_000,
    line10_adjustments: 2_000,
    nonitemizer_cash_contributions: 1_200,
    schedule1a_line44: 3_000,
    schedule1a_line43: 2_000,
    qbi_deduction: 2_000,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  const tax = result.outputs.find((output) =>
    output.nodeType === "income_tax_calculation"
  )!;
  assertEquals(f1040.fields.deduction_method, "standard");
  assertEquals(f1040.fields.standard_deduction, 16_100);
  assertEquals(f1040.fields.line9_total_income, 82_000);
  assertEquals(f1040.fields.line10_adjustments, 2_000);
  assertEquals(tax.fields.taxable_income, 57_900);
  assertEquals(tax.fields.form6251_line1b, 59_900);
  assertEquals(tax.fields.form6251_line2a, 16_100);
});

Deno.test("2026 deduction node selects itemized and honors MFS spouse election", () => {
  const result = standard_deduction_2026.compute(context, {
    filing_status: FilingStatus.MFS,
    line9_total_income: 100_000,
    mfs_spouse_itemizing: true,
    itemized_deductions: 10_000,
    itemized_taxes: 2_000,
    nonitemizer_cash_contributions: 900,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  const tax = result.outputs.find((output) =>
    output.nodeType === "income_tax_calculation"
  )!;
  assertEquals(f1040.fields.deduction_method, "itemized");
  assertEquals(tax.fields.taxable_income, 90_000);
  assertEquals(tax.fields.form6251_line2a, 2_000);
  assertThrows(
    () =>
      standard_deduction_2026.compute(context, {
        filing_status: FilingStatus.Single,
        line9_total_income: 100_000,
        mfs_spouse_itemizing: true,
      }),
    Error,
    "requires MFS",
  );
});

Deno.test("2026 dependent and age factors use year-specific standard deduction", () => {
  const result = standard_deduction_2026.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 20_000,
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 4_000,
    taxpayer_blind: true,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  assertEquals(f1040.fields.standard_deduction, 6_500);
  assertThrows(
    () =>
      standard_deduction_2026.compute(context, {
        filing_status: FilingStatus.Single,
        line9_total_income: 20_000,
        taxpayer_can_be_claimed_as_dependent: true,
      }),
    Error,
    "needs earned income",
  );
});

Deno.test("2026 deduction choice compares standard plus nonitemizer charity", () => {
  const result = standard_deduction_2026.compute(context, {
    filing_status: FilingStatus.Single,
    line9_total_income: 80_000,
    itemized_deductions: 16_600,
    nonitemizer_cash_contributions: 1_000,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  assertEquals(f1040.fields.deduction_method, "standard");
});

Deno.test("2026 deduction, tax, and 1040 nodes execute in graph order", () => {
  const start = buildStartNode([
    {
      node: standard_deduction_2026,
      inputSchema: standard_deduction_2026.inputSchema,
      isArray: false,
    },
  ]);
  const registry: NodeRegistry = {
    start,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    standard_deduction: {
      filing_status: FilingStatus.Single,
      line9_total_income: 80_000,
      nonitemizer_cash_contributions: 1_200,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line12e_standard_or_itemized, 16_100);
  assertEquals(result.pending.f1040.line11a_agi, 80_000);
  assertEquals(result.pending.f1040.line12f_nonitemizer_charity, 1_000);
  assertEquals(result.pending.f1040.line15_taxable_income, 62_900);
  assertEquals(result.pending.f1040.line16_income_tax, 8_550);
});

Deno.test("2026 AGI, deduction, tax, and 1040 run from income facts", () => {
  const start = buildStartNode([{
    node: agi_aggregator,
    inputSchema: agi_aggregator.inputSchema,
    isArray: false,
  }]);
  const registry: NodeRegistry = {
    start,
    agi_aggregator,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    agi_aggregator: {
      filing_status: FilingStatus.Single,
      line1a_wages: 80_000,
      line11_educator_expenses: 1_000,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line9_total_income, 80_000);
  assertEquals(result.pending.f1040.line10_adjustments, 1_000);
  assertEquals(result.pending.f1040.line11a_agi, 79_000);
  assertEquals(result.pending.f1040.line15_taxable_income, 62_900);
  assertEquals(result.pending.f1040.line16_income_tax, 8_550);
});

Deno.test("2026 AGI preserves taxable Social Security and Schedule 1 income", () => {
  const start = buildStartNode([{
    node: agi_aggregator,
    inputSchema: agi_aggregator.inputSchema,
    isArray: false,
  }]);
  const registry: NodeRegistry = {
    start,
    agi_aggregator,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    agi_aggregator: {
      filing_status: FilingStatus.Single,
      line1a_wages: 60_000,
      line6a_ss_gross: 10_000,
      line6b_ss_taxable: 8_000,
      line1_state_refund: 2_000,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line6b_ss_taxable, 8_000);
  assertEquals(result.pending.f1040.line8_additional_income, 2_000);
  assertEquals(result.pending.f1040.line9_total_income, 70_000);
});

Deno.test("2026 W-2 inputs reach wages, withholding, AGI, tax, and refund", () => {
  const start = buildStartNode([
    { node: w2, itemSchema: w2ItemSchema, isArray: true },
    {
      node: agi_aggregator,
      inputSchema: agi_aggregator.inputSchema,
      isArray: false,
    },
  ]);
  const registry: NodeRegistry = {
    start,
    w2,
    agi_aggregator,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    w2: [
      { box1_wages: 40_000, box2_fed_withheld: 5_000 },
      { box1_wages: 40_000, box2_fed_withheld: 5_000 },
    ],
    agi_aggregator: { filing_status: FilingStatus.Single },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line1a_wages, 80_000);
  assertEquals(result.pending.f1040.line9_total_income, 80_000);
  assertEquals(result.pending.f1040.line15_taxable_income, 63_900);
  assertEquals(result.pending.f1040.line16_income_tax, 8_770);
  assertEquals(result.pending.f1040.line25a_w2_withheld, 10_000);
  assertEquals(result.pending.f1040.line35a_refund, 1_230);
});

Deno.test("2026 Schedule 1-A line 44 reduces taxable income in graph", () => {
  const start = buildStartNode([
    {
      node: agi_aggregator,
      inputSchema: agi_aggregator.inputSchema,
      isArray: false,
    },
    { node: schedule1a, inputSchema: schedule1a.inputSchema, isArray: false },
  ]);
  const registry: NodeRegistry = {
    start,
    agi_aggregator,
    schedule1a,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    agi_aggregator: {
      filing_status: FilingStatus.Single,
      line1a_wages: 70_000,
    },
    schedule1a: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
      taxpayer_has_valid_ssn: true,
      taxpayer_age_65_or_older: true,
      qualified_employee_tip_sources_2026: [{
        source: "w2",
        employer_ein: "12-3456789",
        employer_name: "CAFE",
        employee_ssn: "111223333",
        amount: 5_000,
        occupation_codes: ["102"],
      }],
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line43_enhanced_senior, 6_000);
  assertEquals(
    result.pending.schedule1a.line44_total_additional_deductions,
    11_000,
  );
  assertEquals(result.pending.f1040.line13a_schedule1a, 11_000);
  assertEquals(result.pending.f1040.line15_taxable_income, 42_900);
  assertEquals(result.pending.f1040.line16_income_tax, 4_900);
});

Deno.test("2026 W-2 TP and TT amounts reach Schedule 1-A and Form 1040", () => {
  const start = buildStartNode([
    { node: w2, itemSchema: w2ItemSchema, isArray: true },
    {
      node: agi_aggregator,
      inputSchema: agi_aggregator.inputSchema,
      isArray: false,
    },
    { node: schedule1a, inputSchema: schedule1a.inputSchema, isArray: false },
  ]);
  const registry: NodeRegistry = {
    start,
    w2,
    agi_aggregator,
    schedule1a,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 70_000,
      box2_fed_withheld: 5_000,
      box14b_tipped_codes: ["102"],
      box12_entries: [
        { code: "TP", amount: 5_000 },
        { code: "TT", amount: 2_000 },
      ],
    }],
    agi_aggregator: { filing_status: FilingStatus.Single },
    schedule1a: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
      taxpayer_has_valid_ssn: true,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line15_qualified_tips, 5_000);
  assertEquals(result.pending.schedule1a.line27_qualified_overtime, 2_000);
  assertEquals(result.pending.f1040.line13a_schedule1a, 7_000);
  assertEquals(result.pending.f1040.line15_taxable_income, 46_900);
  assertEquals(result.pending.f1040.line16_income_tax, 5_380);
});

Deno.test("2026 W-2 TP and Form 4137 use larger employer tips once", () => {
  const start = buildStartNode([
    { node: w2, itemSchema: w2ItemSchema, isArray: true },
    { node: form4137, inputSchema: form4137.inputSchema, isArray: false },
    {
      node: agi_aggregator,
      inputSchema: agi_aggregator.inputSchema,
      isArray: false,
    },
    { node: schedule1a, inputSchema: schedule1a.inputSchema, isArray: false },
  ]);
  const registry: NodeRegistry = {
    start,
    w2,
    form4137,
    schedule2,
    agi_aggregator,
    schedule1a,
    standard_deduction: standard_deduction_2026,
    income_tax_calculation,
    f1040: f1040_2026_node,
    schedule3a,
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 70_000,
      box3_ss_wages: 70_000,
      box2_fed_withheld: 0,
      box12_entries: [{ code: "TP", amount: 3_000 }],
      box14b_tipped_codes: ["102"],
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 3_000,
        }],
        ss_wages_from_w2: 70_000,
      }],
    },
    agi_aggregator: { filing_status: FilingStatus.Single },
    schedule1a: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
      taxpayer_has_valid_ssn: true,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line15_qualified_tips, 5_000);
  assertEquals(result.pending.f1040.line1c_unreported_tips, 2_000);
  assertEquals(result.pending.f1040.line11a_agi, 72_000);
  assertEquals(result.pending.f1040.line13a_schedule1a, 5_000);
  assertEquals(result.pending.schedule2.line5_unreported_tip_tax, 153);
  assertEquals(result.pending.f1040.line23_other_taxes, 153);
  assertEquals(result.pending.f1040.line24a_total_tax, 6_063);
});
