import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";

const plan = buildExecutionPlan(registry);

function finalValue(value: unknown): unknown {
  return Array.isArray(value) ? value.at(-1) : value;
}

function run(
  general: Record<string, unknown>,
  w2: Record<string, unknown>,
) {
  return execute(plan, registry, { general, w2: [w2] }, {
    taxYear: 2025,
    formType: "f1040",
  });
}

const baseW2 = {
  box1_wages: 30_000,
  box2_fed_withheld: 2_500,
  box3_ss_wages: 30_000,
  box4_ss_withheld: 1_860,
  box5_medicare_wages: 30_000,
  box6_medicare_withheld: 435,
  box7_ss_tips: 5_000,
};

Deno.test("qualified tips: flows from W-2 through Schedule 1-A to tax and refund", () => {
  const result = run(
    { filing_status: "single", taxpayer_ssn: "111-22-3333" },
    { ...baseW2, box14b_tipped_code: "102" },
  );
  const f1040 = result.pending.f1040;

  assertEquals(
    result.diagnostics.filter((d) => d.nodeType === "schedule1a"),
    [],
  );
  assertEquals(result.pending.schedule1a?.qualified_employee_tips, 5_000);
  assertEquals(f1040.line13b_additional_deductions, 5_000);
  assertEquals(f1040.line14_deductions_qbi_total, 20_750);
  assertEquals(finalValue(f1040.line15_taxable_income), 9_250);
  assertEquals(f1040.line24_total_tax, 925);
  assertEquals(f1040.line35a_refund, 1_575);
});

Deno.test("qualified tips: no occupation code leaves taxable income unchanged", () => {
  const result = run(
    { filing_status: "single", taxpayer_ssn: "111-22-3333" },
    baseW2,
  );

  assertEquals(result.pending.f1040.line13b_additional_deductions, undefined);
  assertEquals(finalValue(result.pending.f1040.line15_taxable_income), 14_250);
});

Deno.test("qualified tips: no taxpayer SSN leaves taxable income unchanged", () => {
  const result = run(
    { filing_status: "single" },
    { ...baseW2, box14b_tipped_code: "102" },
  );

  assertEquals(result.pending.f1040.line13b_additional_deductions, undefined);
  assertEquals(finalValue(result.pending.f1040.line15_taxable_income), 14_250);
});

Deno.test("qualified tips: MFS filer does not receive the deduction", () => {
  const result = run(
    { filing_status: "mfs", taxpayer_ssn: "111-22-3333" },
    { ...baseW2, box14b_tipped_code: "102" },
  );

  assertEquals(result.pending.f1040.line13b_additional_deductions, undefined);
  assertEquals(finalValue(result.pending.f1040.line15_taxable_income), 14_250);
});
