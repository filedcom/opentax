import type { z } from "zod";
import type { foreignBankInterest2026Schema } from "./foreign-bank-interest.ts";
import { foreignAccountReviewFixture2026 } from "./foreign-accounts.fixture.ts";
import {
  investmentOwner,
  syntheticInvestmentClaim2026,
} from "./investment.fixture.ts";

const document = (ref: string) => ({
  document_reference: ref,
  document_sha256: "a".repeat(64),
});
export function foreignBankInterestFixture2026(): z.input<
  typeof foreignBankInterest2026Schema
> {
  return {
    tax_year: 2026,
    record_reference: "synthetic-swiss-interest-ledger",
    foreign_account_reference: "synthetic-swiss-account",
    recipient_tin: "123456789",
    institution_name: "SYNTHETIC SWISS BANK",
    account_number: "foreign-account-1",
    country_name: "Switzerland",
    currency_code: "CHF",
    reviewed_on: "2027-01-30",
    reviewer_reference: "synthetic-reviewer",
    annual_review_document: document("synthetic-interest-inventory"),
    annual_interest_summary: {
      gross_interest_native: "1500.50",
      source_document: document("synthetic-annual-bank-summary"),
    },
    cash_method_usd_functional_currency: true,
    complete_current_year_interest_inventory_for_account_currency: true,
    ordinary_taxable_deposit_interest_without_oid_or_other_adjustments: true,
    all_interest_reportable_by_named_recipient_without_nominee_allocation: true,
    no_1099_or_other_source_duplicates_these_receipts: true,
    no_section988_disposition_or_other_account_income_pending: true,
    receipts: [
      {
        record_reference: "synthetic-interest-june",
        bank_transaction_reference: "bank-credit-1",
        received_or_available_on: "2026-06-30",
        credited_and_available_without_restriction_verified: true,
        gross_interest_native: "1000.25",
        foreign_tax_withheld_native: "0",
        source_document: document("synthetic-june-statement"),
        fx: {
          rate_date: "2026-06-30",
          usd_per_currency_unit: "1.10",
          source: "published_spot_rate",
          rate_source_reference: "synthetic-june-rate",
          prevailing_receipt_date_rate_reviewed: true,
          source_document: document("synthetic-june-rate"),
        },
      },
      {
        record_reference: "synthetic-interest-december",
        bank_transaction_reference: "bank-credit-2",
        received_or_available_on: "2026-12-31",
        credited_and_available_without_restriction_verified: true,
        gross_interest_native: "500.25",
        foreign_tax_withheld_native: "0",
        source_document: document("synthetic-december-statement"),
        fx: {
          rate_date: "2026-12-31",
          usd_per_currency_unit: "0.90",
          source: "published_spot_rate",
          rate_source_reference: "synthetic-december-rate",
          prevailing_receipt_date_rate_reviewed: true,
          source_document: document("synthetic-december-rate"),
        },
      },
    ],
  };
}

export function foreignBankInvestmentFixture2026() {
  const claim = syntheticInvestmentClaim2026();
  const review = foreignAccountReviewFixture2026();
  review.accounts[0].relationship = "financial_interest";
  review.accounts[0].income_review = {
    kind: "foreign_bank_interest_statements",
    source_references: ["synthetic-swiss-interest-ledger"],
    all_reportable_income_in_these_statements_verified: true,
    source_document: document("synthetic-account-income-reconciliation"),
  };
  return {
    ...investmentOwner,
    ...claim,
    foreign_accounts_question: true,
    foreign_account_review: review,
    foreign_bank_interest: [foreignBankInterestFixture2026()],
    source_scope_review: {
      ...claim.source_scope_review,
      all_foreign_bank_interest_statements_included: true as const,
    },
  };
}
