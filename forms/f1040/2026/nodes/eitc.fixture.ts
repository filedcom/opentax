import { childCreditGraphFixture2026 } from "./f8812.fixture.ts";
export function eicGraphFixture2026(wages = 10000, count = 1) {
  const base = childCreditGraphFixture2026(wages, count);
  const { w2s, ...rest } = base;
  return {
    ...rest,
    ...(w2s
      ? {
        w2s: w2s.map((item) => ({
          ...item,
          box4_ss_withheld: Math.round(item.box3_ss_wages * .062 * 100) / 100,
        })),
      }
      : {}),
    general: {
      ...base.general,
      do_not_claim_eic: false,
      main_home_in_us_over_half_year: true,
    },
    eitc: {
      tax_year: 2026 as const,
      review_reference: "synthetic-eic-review",
      not_qualifying_child_of_another_taxpayer: true,
      prior_disallowance_review: {
        status: "none" as const,
        irs_account_record_reference: "synthetic-account",
        no_nonclerical_disallowance_since_1996_verified: true as const,
      },
      taxpayer_residency_record_reference: "synthetic-residence",
      no_form2555: true as const,
      no_business_farm_rental_passive_or_capital_disposition_sources:
        true as const,
      no_retirement_disability_inmate_or_workfare_wages: true as const,
      no_medicaid_waiver_payments: true as const,
      no_community_property_allocation: true as const,
      no_qualifying_child_without_valid_ssn: true as const,
      no_separated_spouse_special_rule: true as const,
      combat_pay_election: "include_if_better" as const,
      child_reviews: base.general.dependents.map((d) => ({
        child_tin: d.ssn,
        record_reference: `synthetic-child-review-${d.ssn}`,
        no_competing_eic_claim: true as const,
        unmarried_or_married_child_dependency_rules_satisfied: true as const,
      })),
    },
  };
}
