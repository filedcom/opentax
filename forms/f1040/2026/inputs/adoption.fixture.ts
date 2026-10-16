import type { AdoptionSource2026 } from "./adoption-source.ts";
import type { FinalizedReturnCreditContext } from "../../nodes/intermediate/forms/credits/individual/form8839/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
export function adoptionSource2026(): AdoptionSource2026 {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "400001037",
    wage_sources: [{
      tax_year: 2026,
      source_document_reference: "adoption-w2",
      employer_ein: "123456789",
      employer_name: "Synthetic Employer",
      employee_ssn: "400001037",
      box1_wages: 100000,
      box2_fed_withheld: 10000,
      box3_ss_wages: 104000,
      box12_entries: [{ code: Box12Code.T, amount: 4000 }],
    }],
    claim: {
      tax_year: 2026,
      record_reference: "adoption-annual",
      reviewed_on: "2027-03-01",
      complete_child_expense_benefit_and_prior_claim_inventory_verified: true,
      no_other_taxpayer_limit_allocation_or_unrelated_adoption_attempt_combination:
        true,
      no_current_claim_expense_previously_used_for_credit_verified: true,
      no_reimbursement_of_previously_credited_expenses_verified: true,
      programs: [{
        record_reference: "adoption-program",
        wage_source_reference: "adoption-w2",
        owner_tin: "400001037",
        effective_from: "2026-01-01",
        effective_through: "2026-12-31",
        written_qualified_adoption_assistance_program_verified: true,
        not_more_than_two_percent_s_corporation_owner_verified: true,
      }],
      children: [{
        record_reference: "child-1",
        first_name: "Ada",
        last_name: "Example",
        date_of_birth: "2020-02-01",
        identifying_number: "400001045",
        identifying_number_type: "SSN",
        identity_document_reference: "child-birth-record",
        origin: "domestic",
        effort_started_on: "2024-01-01",
        not_spouses_child_and_legal_nonsurrogacy_adoption_verified: true,
        finalization: {
          kind: "final",
          finalized_on: "2026-07-15",
          decree_reference: "adoption-decree",
          actual_return_parent_named_in_decree_verified: true,
        },
        no_prior_form8839_claim_verified: true,
        expenses: [{
          record_reference: "expense-1",
          receipt_reference: "lawyer-invoice",
          payment_reference: "lawyer-payment",
          incurred_on: "2026-03-01",
          paid_on: "2026-03-02",
          amount: 20000,
          paid_by: "filer",
          owner_tin: "400001037",
          category: "attorney_fee",
          directly_related_reasonable_necessary_and_no_other_federal_tax_use_verified:
            true,
          other_reimbursements: [],
        }],
        current_benefits: [{
          record_reference: "benefit-payment",
          paid_on: "2026-04-01",
          amount: 4000,
          program_reference: "adoption-program",
          expense_allocations: [{
            expense_reference: "expense-1",
            amount: 4000,
          }],
        }],
        prior_foreign_benefits: [],
      }],
    },
  };
}
export function adoptionCreditContext2026(): FinalizedReturnCreditContext {
  return {
    form1040_line11b_agi: 100000,
    form1040_line18_tax_before_credits: 10000,
    magi_additions: {
      puerto_rico_excluded_income: 0,
      form2555_line45: 0,
      form2555_line50: 0,
      form4563_line15: 0,
    },
    child_credit_priority: { basis: "form1040_line19", amount: 2200 },
    schedule3_priority: {
      line1: 0,
      line2: 0,
      line3: 0,
      line4: 0,
      line5b: 0,
      line6d: 0,
      line6f: 0,
      line6g: 0,
      line6l: 0,
      line6m: 0,
    },
  };
}
export function adoptionExclusionIncome2026() {
  return {
    wages_if_all_line23_benefits_excluded: 100000,
    taxable_interest: 0,
    ordinary_dividends: 0,
    taxable_ira: 0,
    taxable_pensions: 0,
    taxable_social_security: 0,
    capital_gain_or_loss: 0,
    schedule1_line10: 0,
    schedule1_adjustments_excluding_student_loan_interest: 0,
    magi_additions: adoptionCreditContext2026().magi_additions,
  };
}
