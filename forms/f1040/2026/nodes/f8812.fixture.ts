import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { DependentRelationship } from "../../nodes/inputs/general/filing/general/index.ts";

export function childCreditGraphFixture2026(wages = 50_000, count = 1) {
  const base = investmentGraphInput2026(wages);
  return {
    general: {
      ...base.general,
      do_not_claim_eic: true,
      wants_federal_public_benefit: true,
      eligible_for_federal_public_benefit: true,
      dependents: Array.from({ length: count }, (_, i) => ({
        first_name: `Child${i + 1}`,
        last_name: "Investor",
        ssn: `22233${4444 + i}`,
        dob: "2010-06-01",
        relationship: DependentRelationship.Son,
        months_in_home: 12,
        lived_in_us_over_half_year: true,
        months_lived_with_you_in_us: 12,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
      })),
    },
    ...(base.w2s ? { w2s: base.w2s } : {}),
    f8812: {
      tax_year: 2026 as const,
      review_reference: "synthetic-child-credit-review",
      prior_disallowance: "none" as const,
      do_not_claim_actc: false,
      no_nonrefundable_credits_other_than_dependent_care: true as const,
      no_foreign_or_territory_exclusions: true as const,
      not_bona_fide_puerto_rico_resident: true as const,
      no_self_employment_or_statutory_employee_income: true as const,
      no_medicaid_waiver_payments: true as const,
    },
  };
}
