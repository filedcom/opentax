import { FilingStatus } from "../../nodes/types.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import type { StudentLoanSource2026 } from "./student-loan-source.ts";
export function syntheticStudentLoan2026(): StudentLoanSource2026 {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    taxpayer_can_be_claimed_as_dependent: false,
    inventory_record_reference: "synthetic-loan-inventory",
    all_loans_payments_and_current_copies_included: true,
    dependency_review: {
      record_reference: "dependency-review",
      taxpayer_claimed_on_another_return: false,
    },
    magi_review: {
      record_reference: "foreign-review",
      no_foreign_housing_deduction: true,
      no_puerto_rico_or_american_samoa_excluded_income: true,
    },
    f1098es: [{
      tax_year: 2026,
      lender_name: "Synthetic Lender",
      lender_tin: "120000001",
      borrower_tin: "123456789",
      account_number: "loan-account-1",
      source_document_reference: "issued-1098e-1",
      box1_student_loan_interest: 3000,
      box2_origination_fees_excluded: false,
    }],
    loans: [{
      loan_id: "loan-1",
      lender_name: "Synthetic Lender",
      lender_tin: "120000001",
      account_number: "loan-account-1",
      borrower_tin: "123456789",
      originated_on: "2020-08-01",
      loan_agreement_reference: "loan-agreement-1",
      loan_kind: "original",
      qualification: {
        review_reference: "qualified-loan-review",
        legally_obligated: true,
        solely_qualified_education_use: true,
        unrelated_lender: true,
        not_qualified_employer_plan: true,
        student_tin: "123456789",
        student_relationship_at_borrowing: "self",
        relationship_review_reference: "student-identity-review",
        eligible_institution: true,
        enrolled_at_least_half_time_in_degree_program: true,
        expenses_within_reasonable_period: true,
        education_expenses_net_of_tax_free_assistance: true,
        expense_and_enrollment_record_reference:
          "tuition-and-enrollment-ledger",
      },
      opening_unpaid_origination_fees: 0,
      opening_accrued_origination_fees: 0,
      opening_capitalized_interest: 0,
      opening_balance_record_reference: "prior-year-loan-ledger",
      fee_allocation_record_reference: "fee-schedule",
      origination_fees_are_for_use_of_money: true,
      payments: [{
        allocation_reference: "payment-1",
        payment_record_reference: "bank-record-1",
        paid_on: "2026-12-01",
        amount_paid: 4000,
        stated_interest_paid: 3000,
        origination_fee_accrued: 0,
        capitalized_interest_added: 0,
        funding: "borrower_or_joint_funds",
        funding_review_reference: "bank-funding",
        interest_deducted_elsewhere: 0,
      }],
      reporting: {
        kind: "1098e",
        statement_reference: "issued-1098e-1",
        box1_allocated_to_loan: 3000,
        origination_fees_in_box1: 0,
        capitalized_interest_in_box1: 0,
        allocation_record_reference: "lender-ledger",
      },
    }],
  };
}
export function studentLoanGraphFixture2026(
  wages: number,
  status = FilingStatus.Single,
) {
  const { investment_income: _investments, ...base } = investmentGraphInput2026(
    wages,
  );
  const {
    filing_status: _status,
    taxpayer_ssn: _ssn,
    spouse_ssn: _spouse,
    taxpayer_can_be_claimed_as_dependent: _dependent,
    spouse_can_be_claimed_as_dependent: _spouseDependent,
    ...claim
  } = syntheticStudentLoan2026();
  return {
    ...base,
    general: {
      ...base.general,
      filing_status: status,
      ...(status === FilingStatus.MFJ
        ? {
          spouse_ssn: "987654321",
          spouse_first_name: "Second",
          spouse_last_name: "Borrower",
          spouse_dob: "1980-01-01",
          spouse_blind: false,
          spouse_can_be_claimed_as_dependent: false,
          spouse_citizen_national_or_work_authorized: true,
          spouse_ssn_valid_for_employment: true,
          spouse_ssn_issued_before_due_date: true,
          spouse_tin_issued_by_due_date: true,
        }
        : {}),
      ...(status === FilingStatus.MFS
        ? {
          spouse_ssn: "987654321",
          spouse_first_name: "Second",
          spouse_last_name: "Borrower",
          mfs_spouse_itemizing: false,
        }
        : {}),
    },
    student_loan_interest: {
      ...claim,
      dependency_review: {
        ...claim.dependency_review,
        ...(status === FilingStatus.MFJ
          ? { spouse_claimed_on_another_return: false }
          : {}),
      },
    },
  };
}
export function studentLoanAllocationFixture2026(oldLoan: boolean) {
  const s = syntheticStudentLoan2026();
  const l = s.loans[0];
  l.originated_on = oldLoan ? "2003-08-01" : "2024-08-01";
  l.opening_unpaid_origination_fees = 300;
  l.opening_capitalized_interest = 625;
  l.payments = [44.27, 43.62].map((stated, i) => ({
    ...l.payments[0],
    allocation_reference: `payment-${i}`,
    payment_record_reference: `bank-${i}`,
    paid_on: i === 0 ? "2026-11-01" : "2026-12-01",
    amount_paid: 200.51,
    stated_interest_paid: stated,
    origination_fee_accrued: 5,
  }));
  s.f1098es![0].box1_student_loan_interest = oldLoan ? 87.89 : 401.02;
  s.f1098es![0].box2_origination_fees_excluded = oldLoan;
  l.reporting = {
    kind: "1098e",
    statement_reference: "issued-1098e-1",
    box1_allocated_to_loan: oldLoan ? 87.89 : 401.02,
    origination_fees_in_box1: oldLoan ? 0 : 10,
    capitalized_interest_in_box1: oldLoan ? 0 : 303.13,
    allocation_record_reference: "lender-payment-allocations",
  };
  return s;
}
