import { FilingStatus } from "../../nodes/types.ts";
import type { DivItem2026, IntItem2026 } from "./investment-source.ts";

export const investmentOwner = {
  filing_status: FilingStatus.Single,
  taxpayer_ssn: "123456789",
};
export const investmentDisclosures = {
  foreign_accounts_question: false as const,
  foreign_trust_question: false as const,
};
export const syntheticInterest2026 = (): IntItem2026 => ({
  tax_year: 2026,
  payer_name: "SYNTHETIC BANK",
  payer_tin: "120000001",
  recipient_tin: "123456789",
  source_document_reference: "synthetic-int-1",
  account_number: "synthetic-account-1",
  box1: 1200.25,
});
export const syntheticDividend2026 = (): DivItem2026 => ({
  tax_year: 2026,
  payerName: "SYNTHETIC FUND",
  payerTin: "120000002",
  recipient_tin: "123456789",
  source_document_reference: "synthetic-div-1",
  account_number: "synthetic-account-1",
  isNominee: false,
  box11: false,
  box1a: 800.25,
  box1b: 500.25,
  qualified_distribution_lots: [{
    distribution_reference: "synthetic-distribution-lot-1",
    amount: 500.25,
    ex_dividend_date: "2026-06-01",
    acquisition_date: "2025-12-01",
    held_through: "2026-12-31",
    preferred_dividend_period_over_366_days: false,
    diminished_risk_periods: [],
    eligible_issuer_and_no_disqualified_dividend: true,
    related_payment_obligation: false,
    brokerage_record_reference: "synthetic-broker-history-1",
  }],
});
export const syntheticPremiumReview2026 = () => ({
  record_reference: "synthetic-bond-ledger",
  per_bond_netting_reviewed: true as const,
  taxable_amortization_elected: true,
  election_record_reference: "synthetic-premium-election",
  box1_reporting: "gross" as const,
  box3_reporting: "gross" as const,
  box8_reporting: "gross" as const,
  pab_share_of_box13: 0,
});
export const syntheticPabReview2026 = () => ({
  specified_bond_eligibility_reference: "synthetic-bond-eligibility",
  no_other_allocable_expenses: true as const,
  taxpayer_expense_review_reference: "synthetic-expense-inventory",
});
export const syntheticPabDividendReview2026 = () => ({
  specified_bond_dividend_confirmed: true as const,
  box13_net_of_fund_expenses_confirmed: true as const,
  no_allocable_taxpayer_deduction_confirmed: true as const,
  not_claimed_elsewhere_on_return_confirmed: true as const,
  bond_eligibility_review_reference: "synthetic-fund-bonds",
  taxpayer_expense_review_reference: "synthetic-expense-inventory",
  reviewed_on: "2027-02-01",
});
