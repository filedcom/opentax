import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus, TS } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

function electedReturn(elect10yr: boolean, includeOtherPension = false) {
  return execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Pat",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "400001107",
      taxpayer_dob: "1930-01-01",
    },
    f1099r: [
      {
        payer_name: "Example Plan",
        payer_ein: "000000009",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      },
      ...(includeOtherPension
        ? [{
          payer_name: "Other Plan",
          payer_ein: "000000009",
          box1_gross_distribution: 1_000,
          box2a_taxable_amount: 1_000,
          box7_distribution_code: DistributionCode.Code7,
        }]
        : []),
    ],
    form4972: {
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      elect_capital_gain: true,
      elect_10yr_averaging: elect10yr,
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4972 Part II only reports its ordinary portion on 1040 lines 5a and 5b", () => {
  const result = electedReturn(false);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4972?.line7, 6_000);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 70_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 70_000);
  assertEquals(result.pending.f1040?.line9_total_income, 70_000);
});

Deno.test("Form 4972 Parts II and III keep the entire distribution off 1040 line 5b", () => {
  const result = electedReturn(true);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5b_pension_taxable ?? 0, 0);
  assertEquals(result.pending.f1040?.line9_total_income ?? 0, 0);
});

Deno.test("Form 4972 Part II ordinary income combines with a separate pension", () => {
  const result = electedReturn(false, true);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 71_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 71_000);
  assertEquals(result.pending.f1040?.line9_total_income, 71_000);
});
