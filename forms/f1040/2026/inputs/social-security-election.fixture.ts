import { FilingStatus } from "../../nodes/types.ts";
import type { PriorBenefitReturn2026 } from "./social-security-election.ts";
import { socialSecurityGraphFixture2026 } from "./social-security.fixture.ts";
export function syntheticPriorBenefitReturn2026(): PriorBenefitReturn2026 {
  return {
    return_id: "prior-return-2025",
    tax_year: 2025,
    filing_status: FilingStatus.Single,
    taxpayer_tin: "123456789",
    return_record_reference: "synthetic-prior-return",
    benefit_records_reference: "synthetic-prior-benefits",
    adjustments_record_reference: "synthetic-prior-adjustments",
    adjusted_gross_income: 23000,
    net_benefits_received_in_year: 0,
    taxable_benefits_reported_on_return: 0,
    tax_exempt_interest: 0,
    adjustments: {
      savings_bond_interest_exclusion: 0,
      adoption_benefits_exclusion: 0,
      student_loan_interest_deduction: 0,
      tuition_and_fees_deduction: 0,
      domestic_production_deduction: 0,
      foreign_earned_income_and_housing: 0,
      territory_income_exclusion: 0,
      unemployment_compensation_exclusion: 0,
    },
    previous_lump_sum_payments: [],
    taxable_benefits_previously_reported_or_refigured: 0,
    prior_lump_sum_history_review_reference: "synthetic-history-review",
  };
}
/** Pub. 915 Terry Jackson amounts, shifted forward one benefit year; all
 * source records and filer identities are synthetic. */
export function lumpSumGraphFixture2026(
  wages = 25500,
  status = FilingStatus.Single,
) {
  const { student_loan_interest: _loan, ...input } =
    socialSecurityGraphFixture2026(wages, status);
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 11000;
  s.box4_repaid = 0;
  s.box5_net_benefits = 11000;
  s.no_prior_year_lump_sum_payments = false;
  s.prior_year_payments = [{
    benefit_year: 2025,
    amount_in_box3: 2000,
    allocation_record_reference: "synthetic-benefit-allocation",
    prior_return_id: "prior-return-2025",
  }];
  input.ssa1099.lump_sum_election = {
    method: "use_if_lower",
    election_review_reference: "synthetic-election-review",
    prior_returns: [syntheticPriorBenefitReturn2026()],
  };
  return input;
}
