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
  parent_income_tax: 9_126,
  parent_tax_method: "ordinary" as const,
  child_unearned_income: 5_000,
  other_children_line5: [],
  other_children_qualified_dividends_line5: [],
  other_children_net_capital_gain_line5: [],
  other_children_schedule_d_tax_worksheet_used: [],
  other_children_form2555_used: [],
  parent_qualified_dividends: 0,
  parent_net_capital_gain: 0,
};

Deno.test("E2E: Form 8615 uses the 2025 Tax Table for low-income tax", () => {
  const result = execute(plan, registry, {
    general: child,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{ payer_name: "Bank", box1: 5_000 }],
    f8615: parent,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8615?.line9_family_tax, 9_402);
  assertEquals(result.pending.form8615?.line15_child_net_income_tax, 136);
  assertEquals(result.pending.form8615?.line17_child_regular_tax, 368);
  assertEquals(result.pending.form8615?.line18_child_tax, 412);
  assertEquals(result.pending.f1040?.line16_income_tax, 412);
});

Deno.test("E2E: Form 8615 still attaches below its line 3 threshold", () => {
  const result = execute(plan, registry, {
    general: child,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{ payer_name: "Bank", box1: 2_000 }],
    f8615: { ...parent, child_unearned_income: 2_000 },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line15_taxable_income, 650);
  assertEquals(result.pending.form8615?.line3_adjusted_unearned_income, -700);
  assertEquals(result.pending.form8615?.line4_child_taxable_income, undefined);
  assertEquals(
    result.pending.form8615?.line5_child_net_unearned_income,
    undefined,
  );
  assertEquals(result.pending.form8615?.line18_child_tax, undefined);
  // The 2025 IRS Tax Table assigns $66 to the single $650-$675 interval:
  // https://www.irs.gov/publications/p1040
  assertEquals(result.pending.f1040?.line16_income_tax, 66);
});

Deno.test("E2E: Form 8615 rejects line 1 that disagrees with the child's income sources", () => {
  const result = execute(plan, registry, {
    general: child,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
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

Deno.test("E2E: Form 8615 qualified dividends use Tax Table worksheet comparisons", () => {
  const result = execute(plan, registry, {
    general: child,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{ payer_name: "Bank", box1: 4_000 }],
    f1099div: [{
      payerName: "Broker",
      isNominee: false,
      box11: false,
      box1a: 1_000,
      box1b: 1_000,
    }],
    f8615: parent,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8615?.line9_family_tax, 9_342);
  assertEquals(result.pending.form8615?.line15_child_net_income_tax, 81);
  assertEquals(result.pending.form8615?.line17_child_regular_tax, 266);
  assertEquals(result.pending.form8615?.line18_child_tax, 297);
  assertEquals(result.pending.f1040?.line16_income_tax, 297);
});
