import { FilingStatus } from "../../nodes/types.ts";
import type { MortgageSource2026 } from "./mortgage-source.ts";
export function syntheticMortgage2026(): MortgageSource2026 {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    inventory_record_reference: "whole-return-mortgages",
    cash_method_of_accounting: true,
    all_qualified_home_loans_included: true,
    no_cooperative_rental_business_or_shared_nonfiler_interest: true,
    properties: [{
      property_id: "main-home",
      address: "100 Example Street",
      residence: "main",
      ownership_and_residence_record: "deed-and-residency",
      qualified_home_since: "1980-01-01",
      remains_qualified_through_year_end: true,
      real_property_or_qualified_manufactured_home: true,
      personal_use_only_all_year: true,
      owned_by_filers_only: true,
    }],
    loans: [{
      loan_id: "home-loan",
      property_id: "main-home",
      borrower_ssns: ["111223333"],
      lender_tin: "123456789",
      account_number: "home-account",
      origination_date: "2020-01-01",
      original_principal: 500_000,
      original_note_reference: "purchase-note",
      maturity_date: "2050-01-01",
      purpose: "purchase",
      acquisition_use_record_reference: "closing-disclosure",
      all_proceeds_acquire_build_or_improve_secured_home: true,
      secured_by_identified_qualified_home_throughout: true,
      no_additional_advances_or_mixed_use: true,
      not_deducted_elsewhere: true,
      no_mortgage_credit_certificate: true,
      no_prior_year_prepaid_interest_or_points_omitted: true,
      monthly_balances: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          closing_balance: 490_000,
          lender_statement_reference: `balance-${i + 1}`,
        }),
      ),
      interest_statements: [{
        source_document_reference: "1098-home",
        kind: "form1098",
        lender_name: "Example Bank",
        lender_tin: "123456789",
        account_number: "home-account",
        borrower_ssn: "111223333",
        interest_received: 24_000,
        payments: Array.from(
          { length: 12 },
          (_, i) => ({
            payment_id: `interest-${i + 1}`,
            payment_record: `bank-${i + 1}`,
            payer_ssn: "111223333",
            paid_on: `2026-${String(i + 1).padStart(2, "0")}-01`,
            interest_paid: 2000,
            current_year_interest_refund: 0,
          }),
        ),
        interest_allocable_to_2027: 0,
        accrual_review_reference: "annual-accrual",
        form1098: {
          tax_year: 2026,
          box2_outstanding_principal: 490_000,
          box3_origination_date: "2020-01-01",
          box4_prior_year_refund: 0,
          box5_mortgage_insurance: 1200,
          box6_points: 0,
          box8_property_address: "100 Example Street",
          box9_properties: 1,
        },
        seller_financed: false,
      }],
      mortgage_insurance: [{
        premium_id: "annual-pmi",
        source_document_reference: "premium-ledger",
        payer_ssn: "111223333",
        paid_on: "2026-12-01",
        contract_issued_on: "2020-01-01",
        provider: "private",
        qualified_insurance_record: "insurance-contract",
        amount_paid: 1200,
        refunded_amount: 0,
        current_form1098_reference: "1098-home",
        allocation: { method: "current_period", coverage_year: 2026 },
      }],
    }],
  };
}
export function syntheticPurchasePoints2026(): MortgageSource2026 {
  const raw = syntheticMortgage2026();
  raw.properties[0].qualified_home_since = "2026-07-01";
  const loan = raw.loans[0];
  loan.origination_date = "2026-07-01";
  loan.maturity_date = "2056-07-01";
  loan.monthly_balances = loan.monthly_balances.map((row) => ({
    ...row,
    closing_balance: row.month < 7 ? 0 : 490_000,
  }));
  const s = loan.interest_statements[0];
  s.form1098!.box3_origination_date = loan.origination_date;
  s.form1098!.box2_outstanding_principal = 500_000;
  s.form1098!.box5_mortgage_insurance = 0;
  s.form1098!.box6_points = 10_000;
  s.payments = s.payments.slice(6);
  s.interest_received = 12_000;
  loan.mortgage_insurance = [];
  loan.points = [{
    points_id: "purchase-points",
    points_paid_separately_not_financed: true,
    source_document_reference: "closing-points",
    payer_ssn: "111223333",
    paid_on: "2026-07-01",
    total_points: 10_000,
    service_charges: 0,
    seller_paid_points: 1000,
    reported_on_form1098: true,
    current_form1098_reference: "1098-home",
    treatment: "immediate",
    immediate_review: {
      settlement_reference: "closing-disclosure",
      established_practice_reference: "local-practice",
      customary_points_percentage: 2,
      cash_accounting: true,
      points_not_substitute_for_service_charges: true,
      points_computed_as_percentage_of_principal: true,
      settlement_separately_identifies_points: true,
      funds_provided_without_lender_or_broker_borrowing: 9000,
    },
    loan_term_months: 360,
    comparable_local_loan_terms_reference: "local-loan-terms",
    payment_months_2026: Array.from(
      { length: 6 },
      (_, i) => ({ month: i + 7, payment_record: `points-month-${i + 7}` }),
    ),
  }];
  return raw;
}

export function syntheticMortgagePayoff2026(): MortgageSource2026 {
  const raw = syntheticMortgage2026();
  const loan = raw.loans[0];
  loan.payoff = {
    paid_on: "2026-07-01",
    payoff_statement_reference: "july-payoff",
    principal_before_payoff: 490000,
    full_payoff_verified: true,
    reason: "repayment",
  };
  loan.monthly_balances.forEach((b) => {
    if (b.month >= 7) b.closing_balance = 0;
  });
  const s = loan.interest_statements[0];
  s.payments = s.payments.slice(0, 7);
  s.interest_received = 14000;
  s.form1098!.box5_mortgage_insurance = 0;
  loan.mortgage_insurance = [];
  loan.points = [{
    points_id: "original-points",
    source_document_reference: "2020-closing",
    payer_ssn: "111223333",
    paid_on: loan.origination_date,
    points_paid_separately_not_financed: true,
    total_points: 3000,
    seller_paid_points: 0,
    service_charges: 0,
    reported_on_form1098: false,
    treatment: "ratable",
    loan_term_months: 360,
    comparable_local_loan_terms_reference: "2020-comparable-terms",
    payment_months_2026: Array.from({ length: 6 }, (_, i) => ({
      month: i + 1,
      payment_record: `old-points-${i + 1}`,
    })),
    prior_allocation: {
      filed_return_and_points_workpaper_reference: "prior-points-ledger",
      allocated_before_2026: 600,
      remaining_unallocated_at_start_2026: 2400,
    },
  }];
  return raw;
}

export function syntheticMortgageRefinance2026(
  sameLender = false,
): MortgageSource2026 {
  const raw = syntheticMortgagePayoff2026();
  const old = raw.loans[0];
  old.payoff!.reason = "refinance";
  old.payoff!.successor_loan_id = "replacement-loan";
  const loan = structuredClone(old);
  loan.loan_id = "replacement-loan";
  loan.account_number = "replacement-account";
  loan.lender_tin = sameLender ? old.lender_tin : "987654321";
  loan.origination_date = "2026-07-01";
  loan.original_principal = 490000;
  loan.original_note_reference = "replacement-note";
  loan.payoff = undefined;
  loan.purpose = "refinance";
  loan.refinance = {
    original_acquisition_date: old.origination_date,
    original_acquisition_record: old.acquisition_use_record_reference,
    predecessor_payoff_reference: old.payoff!.payoff_statement_reference,
    predecessor_principal_at_refinance: 490000,
    original_maturity_date: old.maturity_date,
    no_cashout_or_term_extension: true,
    predecessor_loan_id: old.loan_id,
    carried_points_payment_months_2026: sameLender
      ? Array.from(
        { length: 5 },
        (_, i) => ({ month: i + 8, payment_record: `new-points-${i + 8}` }),
      )
      : undefined,
  };
  loan.points = [];
  loan.monthly_balances.forEach((b) => {
    b.closing_balance = b.month < 7 ? 0 : 490000;
    b.lender_statement_reference = `new-${b.month}`;
  });
  const s = loan.interest_statements[0];
  s.source_document_reference = "1098-replacement";
  s.lender_tin = loan.lender_tin;
  s.account_number = loan.account_number;
  s.form1098!.box2_outstanding_principal = 490000;
  s.form1098!.box3_origination_date = loan.origination_date;
  s.payments = syntheticMortgage2026().loans[0].interest_statements[0].payments
    .slice(7)
    .map((p) => ({
      ...p,
      payment_id: `new-${p.payment_id}`,
      payment_record: `new-${p.payment_record}`,
    }));
  s.interest_received = 10000;
  raw.loans.push(loan);
  return raw;
}
