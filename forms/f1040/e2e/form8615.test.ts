import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

const child = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Child",
  taxpayer_ssn: "123-45-6789",
  taxpayer_dob: "2011-06-15",
  taxpayer_can_be_claimed_as_dependent: true,
  dependent_earned_income: 0,
};

const parent = {
  eligibility_confirmed: true as const,
  parent_name: "Jane Parent",
  parent_name_control: "PARE",
  parent_ssn: "987-65-4321",
  parent_filing_status: FilingStatus.MFJ,
  parent_taxable_income: 80_000,
  parent_income_tax: 9_123,
  parent_tax_method: "ordinary" as const,
  child_unearned_income: 5_000,
  other_children_line5: [],
};

Deno.test("E2E: Form 8615 replaces the dependent child's line 16 tax", () => {
  const result = execute(plan, registry, {
    general: child,
    f1099int: [{ payer_name: "Bank", box1: 5_000 }],
    f8615: parent,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line12a_standard_deduction, 1_350);
  assertEquals(result.pending.f1040?.line15_taxable_income, 3_650);
  assertEquals(result.pending.form8615?.line18_child_tax, 411);
  assertEquals(result.pending.f1040?.line16_income_tax, 411);
  assertEquals(result.pending.f1040?.line24_total_tax, 411);
  assertEquals(
    result.pending.schedule2?.line17z_other_additional_taxes,
    undefined,
  );
});

Deno.test("E2E: Form 8615 still attaches below its line 3 threshold", () => {
  const result = execute(plan, registry, {
    general: child,
    f1099int: [{ payer_name: "Bank", box1: 2_000 }],
    f8615: { ...parent, child_unearned_income: 2_000 },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line15_taxable_income, 650);
  assertEquals(result.pending.form8615?.line3_adjusted_unearned_income, -700);
  assertEquals(result.pending.form8615?.line18_child_tax, undefined);
  assertEquals(result.pending.f1040?.line16_income_tax, 65);
});

Deno.test("E2E: Form 8615 rejects line 1 that disagrees with the child's income sources", () => {
  const result = execute(plan, registry, {
    general: child,
    f1099int: [{ payer_name: "Bank", box1: 5_000 }],
    f8615: { ...parent, child_unearned_income: 6_000 },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      String(diagnostic.message).includes("does not match the return sources")
    ),
    true,
  );
});
