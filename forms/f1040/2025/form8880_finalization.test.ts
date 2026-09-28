import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildStartNode } from "./start.ts";
import { form8880 } from "../nodes/intermediate/forms/form8880/index.ts";
import { schedule3 } from "../nodes/intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { form8880 as form8880Mef } from "./mef/forms/f8880.ts";
import { form8880Pdf } from "./pdf/forms/f8880.ts";
import { registry } from "./registry.ts";

const start = buildStartNode([
  {
    node: form8880,
    inputKey: "retirement",
    inputSchema: form8880.inputSchema,
    isArray: false,
  },
  {
    node: schedule3,
    inputKey: "priority",
    inputSchema: schedule3.inputSchema,
    isArray: false,
  },
  {
    node: f1040,
    inputKey: "return",
    inputSchema: f1040.inputSchema,
    isArray: false,
  },
]);
const nodes = { start, form8880, schedule3, f1040 };
const plan = buildExecutionPlan(nodes);
const source = {
  ira_contributions_taxpayer: 2_000,
  agi: 20_000,
  filing_status: FilingStatus.Single,
  taxpayer_dob: "1980-01-01",
  taxpayer_student_five_months: false,
  taxpayer_claimed_as_dependent: false,
};

Deno.test("Form 8880 source, Schedule 3, and Form 1040 remain in DAG order", () => {
  const ordered = buildExecutionPlan(registry).map((step) => step.nodeType);
  assertEquals(
    ordered.indexOf("form8880") < ordered.indexOf("schedule3"),
    true,
  );
  assertEquals(ordered.indexOf("schedule3") < ordered.indexOf("f1040"), true);
});

Deno.test("public general and W-2 inputs deliver one scalar Form 8880 filing status", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-01-01",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
    },
    w2: [{
      employee_ssn: "123-45-6789",
      box1_wages: 20_000,
      box2_fed_withheld: 500,
      box12_entries: [{ code: "D", amount: 2_000 }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.pending.form8880.filing_status, FilingStatus.Single);
  assertEquals(
    result.diagnostics.some((entry) => entry.nodeType === "form8880"),
    false,
  );
  assertEquals(result.pending.form8880.print_line2a_deferrals, 2_000);
});

function run(tax: number, priority = 100) {
  return execute(plan, nodes, {
    retirement: source,
    priority: { line2_childcare_credit: priority },
    return: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line16_income_tax: tax,
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 8880 finalizes from sourced tax and prior credit without a DAG cycle", () => {
  const result = run(800);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8880.print_line11_tax_liability, 700);
  assertEquals(result.pending.form8880.print_line12_credit, 700);
  assertEquals(result.pending.form8880.ira_contributions_taxpayer, 2_000);
  assertEquals(result.pending.schedule3.line4_retirement_savings_credit, 700);
  assertEquals(result.pending.schedule3.line8_total, 800);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 800);
  assertEquals(result.pending.f1040.line22_tax_after_credits, 0);
  assertStringIncludes(
    form8880Mef.build(result.pending.form8880, { pending: result.pending }),
    "<CrQualifiedRetirementSavAmt>700</CrQualifiedRetirementSavAmt>",
  );
  assertEquals(
    form8880Pdf.projectFields!(result.pending.form8880, result.pending)
      .print_line12_credit,
    700,
  );
});

Deno.test("Form 8880 limit subtracts every higher-priority Schedule 3 worksheet line", () => {
  const result = execute(plan, nodes, {
    retirement: source,
    priority: {
      line1_foreign_tax_credit: 100,
      line2_childcare_credit: 150,
      line3_education_credit: 200,
      line6d_elderly_disabled_credit: 100,
      line6l_form8978_credit: 150,
    },
    return: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line16_income_tax: 1_000,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8880.print_line11_tax_liability, 300);
  assertEquals(result.pending.form8880.print_line12_credit, 300);
  assertEquals(result.pending.schedule3.line8_total, 1_000);
});

Deno.test("Form 8880 finalized zero capacity cannot claim Schedule 3 line 4", () => {
  const result = run(100);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8880.calculated_zero_credit, true);
  assertEquals(
    result.pending.schedule3.line4_retirement_savings_credit,
    undefined,
  );
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 100);
});

Deno.test("Form 8880 credit enters later clean-vehicle priority once", () => {
  const result = execute(plan, nodes, {
    retirement: source,
    priority: {
      line2_childcare_credit: 100,
      line6f_clean_vehicle_credit: 200,
    },
    return: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line16_income_tax: 800,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8880.print_line12_credit, 700);
  assertEquals(result.pending.schedule3.line6f_total, undefined);
  assertEquals(result.pending.schedule3.line8_total, 800);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 800);
});

Deno.test("Form 8880 rejects prefilled Schedule 3 line 4 instead of double counting", () => {
  const result = execute(plan, nodes, {
    retirement: source,
    priority: { line4_retirement_savings_credit: 50 },
    return: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line16_income_tax: 800,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "f1040" &&
      entry.message.includes("conflicts with a prefilled")
    ),
    true,
  );
});

Deno.test("Form 8880 rejects manually asserted tax capacity at its source boundary", () => {
  const result = execute(plan, nodes, {
    retirement: { ...source, income_tax_liability: 9_999 },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) => entry.nodeType === "start"),
    true,
  );
});

Deno.test("Form 8880 cannot finalize a positive source without line 16 tax", () => {
  const result = execute(plan, nodes, {
    retirement: source,
    return: { filing_status: FilingStatus.Single, line11_agi: 20_000 },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "f1040" &&
      entry.message.includes("needs sourced Form 1040 line 16")
    ),
    true,
  );
});
