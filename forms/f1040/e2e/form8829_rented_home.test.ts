import { assert, assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import type { RentedHomeSource } from "../nodes/intermediate/forms/form_8829/index.ts";
import { TS } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);
const context = { taxYear: 2025, formType: "f1040" };

const rentedHome: RentedHomeSource = {
  business_reference: "C-1",
  home_identifier: "HOME-1",
  recipient: TS.T,
  business_area_sqft: 200,
  total_area_sqft: 1_000,
  schedule_c_line29_tentative_profit: 50_000,
  insurance_indirect: 1_000,
  rent_indirect: 10_000,
  repairs_indirect: 500,
  utilities_indirect: 2_000,
  other_indirect: 500,
  prior_operating_carryover: 100,
  regular_exclusive_use_verified: true,
  actual_expense_method_verified: true,
  rented_home_verified: true,
  sole_home_and_business_verified: true,
  all_schedule_c_gross_income_attributable_to_home_verified: true,
  no_daycare_or_inventory_exception: true,
  no_home_business_gain_or_other_trade_loss: true,
  no_casualty_mortgage_tax_or_depreciation: true,
  home_expenses_excluded_from_schedule_c_verified: true,
};

function filing(source: RentedHomeSource, proprietor?: TS.T) {
  return execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    schedule_c: [{
      business_reference: "C-1",
      ...(proprietor === undefined ? {} : { proprietor_recipient: proprietor }),
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 50_000,
    }],
    form_8829: { rented_home: source },
  }, context);
}

Deno.test("Form 8829 precedes Schedule C and downstream 1040 nodes without a cycle", () => {
  const position = (name: string) =>
    plan.findIndex((step) => step.nodeType === name);
  for (
    const [upstream, downstream] of [
      ["form_8829", "schedule_c"],
      ["schedule_c", "schedule_se"],
      ["schedule_c", "form8995"],
      ["schedule_c", "agi_aggregator"],
      ["agi_aggregator", "f1040"],
    ]
  ) {
    assert(position(upstream) >= 0);
    assert(position(upstream) < position(downstream));
  }
});

Deno.test("Form 8829 rented home reaches Schedule C, SE, QBI, AGI, and final 1040", () => {
  const result = filing(rentedHome, TS.T);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form_8829?.line36, 2_900);
  assertEquals(result.pending.schedule_c?.form8829_line30, {
    business_reference: "C-1",
    home_identifier: "HOME-1",
    recipient: TS.T,
    schedule_c_line29_tentative_profit: 50_000,
    line36: 2_900,
  });
  assertEquals(result.pending.schedule1?.line3_schedule_c, 47_100);
  assertEquals(result.pending.schedule_se?.net_profit_schedule_c, 47_100);
  assertEquals(result.pending.form8995?.qbi_from_schedule_c, 47_100);
  assertEquals(result.pending.f1040?.line8_additional_income, 47_100);
  assert((result.pending.f1040?.line11_agi as number) < 47_100);
  assert((result.pending.f1040?.line13_qbi_deduction as number) > 0);
});

Deno.test("Form 8829 mismatch and ambiguous owner fail closed at Schedule C", () => {
  const mismatched = filing({
    ...rentedHome,
    schedule_c_line29_tentative_profit: 50_001,
  }, TS.T);
  assert(
    mismatched.diagnostics.some((entry) =>
      entry.nodeType === "schedule_c" && entry.message.includes("line 29")
    ),
  );
  assertEquals(mismatched.pending.schedule1?.line3_schedule_c, undefined);

  const spouse = filing({ ...rentedHome, recipient: TS.S }, TS.T);
  assert(spouse.diagnostics.some((entry) => entry.nodeType === "schedule_c"));
  assertEquals(spouse.pending.schedule1?.line3_schedule_c, undefined);

  const unspecified = filing(rentedHome, undefined);
  assert(
    unspecified.diagnostics.some((entry) => entry.nodeType === "schedule_c"),
  );
  assertEquals(unspecified.pending.schedule1?.line3_schedule_c, undefined);
});
