import { FilingStatus } from "../../nodes/types.ts";
import type { SocialSecuritySource2026 } from "./social-security-source.ts";
import { studentLoanGraphFixture2026 } from "./student-loan.fixture.ts";
export function syntheticSocialSecurity2026(): SocialSecuritySource2026 {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    inventory_record_reference: "synthetic-benefits-inventory",
    all_current_statements_and_repayments_included: true,
    worksheet_scope_review: {
      record_reference: "synthetic-worksheet-review",
      no_savings_bond_interest_exclusion: true,
      no_adoption_benefit_exclusion: true,
      no_foreign_housing_deduction: true,
      no_puerto_rico_or_american_samoa_excluded_income: true,
      no_ira_contribution_requiring_coordinated_benefits_worksheet: true,
    },
    statements: [{
      tax_year: 2026,
      is_rrb: false,
      payer_name: "Social Security Administration",
      recipient_tin: "XXX-XX-6789",
      recipient_name: "Synthetic Investor",
      recipient: "taxpayer",
      recipient_identity_review_reference: "synthetic-beneficiary-review",
      claim_number: "claim-1",
      source_document_reference: "ssa-copy-1",
      current_copy_review_reference: "synthetic-copy-review",
      corrected: false,
      replaces_statement_references: [],
      box3_gross_benefits: 12000,
      box4_repaid: 2000,
      box5_net_benefits: 10000,
      box6_federal_withheld: 900.25,
      workers_compensation_offset_in_box3: 1500,
      medicare_premiums_paid: 2000,
      no_prior_year_lump_sum_payments: true,
      no_disability_repayment_to_employer_or_insurer: true,
    }],
  };
}
export function socialSecurityGraphFixture2026(
  wages = 85000,
  status = FilingStatus.Single,
) {
  const base = studentLoanGraphFixture2026(wages, status);
  const {
    filing_status: _status,
    taxpayer_ssn: _tin,
    spouse_ssn: _spouse,
    ...claim
  } = syntheticSocialSecurity2026();
  return { ...base, ssa1099: claim };
}
