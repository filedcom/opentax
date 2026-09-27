import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus, TS } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

function electedReturn(
  elect10yr: boolean,
  includeOtherPension = false,
  deathBenefit = 0,
  includedNua = 0,
  federalEstateTax = 0,
) {
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
        ...(includedNua > 0 ? { box6_nua: includedNua } : {}),
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
      beneficiary_distribution: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      prior_beneficiary_election_after_1986: false,
      elect_capital_gain: true,
      elect_10yr_averaging: elect10yr,
      ...(includedNua > 0 ? { elect_include_nua: true } : {}),
      ...(deathBenefit > 0 || federalEstateTax > 0
        ? {
          beneficiary_distribution: true,
          ...(deathBenefit > 0
            ? {
              death_benefit_exclusion: deathBenefit,
              participant_died_before_1996_08_21: true,
            }
            : {}),
        }
        : {}),
      ...(federalEstateTax > 0 ? { federal_estate_tax: federalEstateTax } : {}),
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

Deno.test("Form 4972 Part II death benefit reduces the 1040 ordinary-income share", () => {
  const result = electedReturn(false, false, 5_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4972?.line6, 28_500);
  assertEquals(result.pending.form4972?.line7, 5_700);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 66_500);
  assertEquals(result.pending.f1040?.line9_total_income, 66_500);
});

Deno.test("Form 4972 Part II NUA election reaches Form 1040 ordinary income", () => {
  const result = electedReturn(false, false, 0, 20_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4972?.line6, 36_000);
  assertEquals(result.pending.form4972?.line7, 7_200);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 84_000);
  assertEquals(result.pending.f1040?.line9_total_income, 84_000);
});

Deno.test("Form 4972 Part II-only estate tax reaches Schedule A without reducing pension income", () => {
  const result = electedReturn(false, false, 0, 0, 4_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4972?.line6, 28_800);
  assertEquals(result.pending.form4972?.line7, 5_760);
  assertEquals(result.pending.form4972?.line18, undefined);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 70_000);
  assertEquals(result.pending.schedule_a?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 combined election keeps the ordinary estate-tax share on line 18", () => {
  const result = electedReturn(true, false, 0, 0, 4_000);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4972?.line6, 28_800);
  assertEquals(result.pending.form4972?.line18, 2_800);
  assertEquals(result.pending.schedule_a?.line_16_other_deductions, undefined);
});
