import { saverSource2026 } from "./savers-credit.fixture.ts";
import type { AbleSource2026 } from "./able-source.ts";
import { AbleEligibilityBasis } from "../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { AbleExpenseCategory } from "../../nodes/intermediate/forms/credits/individual/form8880/able_distribution_review.ts";
export function ableSource2026(): AbleSource2026 {
  const s = saverSource2026();
  return {
    filing_status: s.filing_status,
    taxpayer_ssn: s.taxpayer_ssn,
    taxpayer_dob: s.taxpayer_dob,
    wage_sources: s.wage_sources.map((w) => ({ ...w, box12_entries: [] })),
    claim: {
      tax_year: 2026,
      record_reference: "able-inventory",
      reviewed_on: "2027-04-15",
      complete_current_able_accounts_contributions_distributions_and_corrections_verified:
        true,
      accounts: [{
        form5498qa: {
          tax_year: 2026,
          source_document_ref: "issued-5498qa",
          beneficiary_ssn: s.taxpayer_ssn,
          program_ein: "123456789",
          account_number: "able-account",
          box1_contributions: 2000,
          box2_able_rollovers: 0,
          box8_trump_account_rollover: 0,
          box6_eligibility_basis: AbleEligibilityBasis.SSDI,
          current_issued_copy_or_program_substitute_after_corrections_verified:
            true,
        },
        eligibility: {
          record_reference: "eligibility-record",
          blindness_or_disability_onset: "2020-01-01",
          eligibility_basis_matches_program_and_statutory_requirements_verified:
            true,
          eligibility_active_for_all_contributions_and_expenses_verified: true,
          living_beneficiary_and_no_beneficiary_changes_verified: true,
        },
        program_review_ref: "program-review",
        contribution_detail_ref: "contribution-detail",
        no_current_year_able_distributions_confirmed: true,
        no_returned_or_excess_contributions_confirmed: true,
        no_prior_year_excess_contributions_confirmed: true,
        within_program_cumulative_limit_confirmed: true,
        other_contributors_cash: 0,
        qtp_rollovers_or_transfers: 0,
        beneficiary_payments: [{
          source_document_ref: "own-payment",
          paid_on: "2026-05-01",
          contributor_ssn: s.taxpayer_ssn,
          amount: 2000,
        }],
      }],
    },
  };
}
export function ableEmployment2026(
  source = ableSource2026(),
): NonNullable<
  AbleSource2026["claim"]["accounts"][number]["employed_beneficiary_review"]
> {
  return {
    record_reference: "employment-review",
    no_401a_403a_defined_contribution_403b_or_457b_contributions_verified: true,
    no_other_compensation_or_self_employed_retirement_deduction_verified: true,
    wages: (source.wage_sources ?? []).map((w) => ({
      source_document_reference: w.source_document_reference,
      employer_plan_review_reference: "employer-plan-review",
      wages_for_current_services_verified: true,
    })),
    personal_service_business_references: [],
    listed_businesses_personal_services_material_income_factor_verified: true,
    residence_periods: [{
      source_document_ref: "residence",
      state: "CA",
      from: "2026-01-01",
      through: "2026-12-31",
    }],
  };
}
export function ableDistribution2026(
  source = ableSource2026(),
): NonNullable<
  AbleSource2026["claim"]["accounts"][number]["current_year_distributions"]
> {
  const q = source.claim.accounts[0].form5498qa;
  return {
    qualification_review_ref: "distribution-review",
    complete_distribution_and_expense_inventory_confirmed: true,
    no_rollovers_transfers_or_beneficiary_changes_confirmed: true,
    no_returned_excess_or_additional_accounts_confirmed: true,
    beneficiary_alive_through_all_distributions_confirmed: true,
    form1099qa: {
      tax_year: 2026,
      source_document_ref: "issued-1099qa",
      recipient_ssn: q.beneficiary_ssn,
      program_ein: q.program_ein,
      account_number: q.account_number,
      box1_gross_distribution: 2000,
      box2_earnings: 400,
      box3_basis: 1600,
      box4_program_transfer: false,
      box5_account_terminated: false,
      box6_other_recipient: false,
    },
    distributions: [{
      source_document_ref: "distribution-payment",
      received_on: "2026-06-01",
      amount: 2000,
    }],
    qualified_expenses: [{
      source_document_ref: "qualified-expense",
      beneficiary_ssn: q.beneficiary_ssn,
      category: AbleExpenseCategory.Health,
      paid_on: "2026-07-01",
      amount: 1000,
      relates_to_beneficiary_disability_confirmed: true,
      not_used_for_other_tax_benefits_confirmed: true,
      not_allocated_to_another_tax_year_confirmed: true,
    }],
  };
}
