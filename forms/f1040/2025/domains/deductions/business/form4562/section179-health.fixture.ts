import { withHealthPolicyRecords } from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/policy-records.fixture.ts";
import {
  section179Cases,
  section179InventoryInput,
} from "./section179-inventory.fixture.ts";
import { singleScheduleCPlanSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/single-source.ts";
import { TS } from "../../../../../nodes/types.ts";

export const section179HealthCases = [
  {
    id: "179-health-full",
    monthlyPremium: 500,
    excludedMonths: 0,
    health: 6000,
    qbi: 659,
    tax: 5120,
  },
  {
    id: "179-health-income-limited",
    monthlyPremium: 1000,
    excludedMonths: 0,
    health: 9293,
    qbi: 0,
    tax: 4808,
  },
  {
    id: "179-health-employer-months",
    monthlyPremium: 1000,
    excludedMonths: 6,
    health: 6000,
    qbi: 659,
    tax: 5120,
  },
  {
    id: "179-health-active-income-limit",
    monthlyPremium: 1000,
    excludedMonths: 0,
    health: 9293,
    qbi: 0,
    tax: 1413,
  },
] as const;
export function section179HealthInput(
  scenario: typeof section179HealthCases[number],
) {
  const source = section179InventoryInput(section179Cases[0]);
  const large = scenario.id === "179-health-active-income-limit";
  return {
    ...source,
    schedule_c: source.schedule_c.map((c) => ({
      ...c,
      line_1_gross_receipts: large ? 69104 : c.line_1_gross_receipts,
      line_13_depreciation: large ? 59104 : c.line_13_depreciation,
    })),
    f8911: {
      properties: source.f8911!.properties.map((p) => ({
        ...p,
        cost: large ? 100000 : p.cost,
        business_source: {
          ...p.business_source,
          section179_deduction: large ? 20000 : 2000,
        },
      })),
    },
    form4562: {
      current_year_inventory: {
        ...source.form4562.current_year_inventory,
        assets: source.form4562.current_year_inventory.assets.map((a) => ({
          ...a,
          cost: large ? 100000 : a.cost,
          section179_deduction: large ? 20000 : 2000,
          credit_basis_reduction: large ? 4800 : 480,
        })),
        section179_election: {
          ...source.form4562.current_year_inventory.section179_election,
          taxpayer_active_business_income: (large ? 80000 : 62000) -
            scenario.health,
          active_business_income_review_reference:
            "Wages plus Schedule C before section 179 and half-SE, after sourced health deduction",
        },
      },
    },
    form7206: {
      marketplace_ptc_premium_overlap: false,
      single_schedule_c_plan: withHealthPolicyRecords(
        singleScheduleCPlanSchema.parse({
          business_reference: source.schedule_c[0].business_reference,
          plan_identifier: `${scenario.id}-policy`,
          recipient: TS.T,
          taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
          premium_months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            paid_premium: scenario.monthlyPremium,
            policy_source_reference: `${scenario.id}-issued-policy`,
            payment_source_reference: `${scenario.id}-payment-${i + 1}`,
            covered_person: "taxpayer",
            eligible_for_subsidized_employer_plan: i < scenario.excludedMonths,
            employer_plan_review_reference: `${scenario.id}-eligibility-${
              i + 1
            }`,
            marketplace_policy: false,
            long_term_care_policy: false,
            public_safety_officer_excluded_amount: 0,
          })),
          schedule_c_line31_net_profit: 10000,
          schedule1_line15_se_tax_deduction: 707,
          schedule1_line16_retirement_deduction: 0,
          plan_established_under_business: true,
          sole_positive_business_verified: true,
          no_form2555: true,
          no_schedule_se_optional_method: true,
          no_other_earned_income: true,
        }),
      ),
    },
  };
}
