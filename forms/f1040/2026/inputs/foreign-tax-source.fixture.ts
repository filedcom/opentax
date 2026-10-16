import { FilingStatus } from "../../nodes/types.ts";
import {
  ForeignTaxKind,
  IncomeCategory,
} from "../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import type { ForeignTaxSource2026 } from "./foreign-tax-source.ts";
export const foreignTaxDocument2026 = (ref: string) => ({
  document_reference: ref,
  document_sha256: "a".repeat(64),
});
export function foreignTaxAllocation2026(ref = "tax-allocation") {
  return {
    record_reference: ref,
    country_name: "Switzerland",
    income_category: IncomeCategory.Passive,
    tax_kind: ForeignTaxKind.Interest,
    income_source_references: ["foreign-interest-receipt-1"],
    amount_native: "100.25",
    allocation_document: foreignTaxDocument2026("tax-base-allocation"),
    creditability_review: {
      source_document: foreignTaxDocument2026("creditability-review"),
      legal_actual_taxpayer_compulsory_income_tax_or_in_lieu_tax_reviewed:
        true as const,
      holding_period_related_payments_subsidies_and_other_section901_disallowances_reviewed:
        true as const,
      all_disallowed_amounts_identified_in_reduction: true as const,
      excluded_income_and_other_line12_reductions_reviewed: true as const,
    },
  };
}
export function foreignTaxFixture2026(): ForeignTaxSource2026 {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    claim: {
      tax_year: 2026,
      record_reference: "foreign-tax-inventory",
      reviewed_on: "2027-02-01",
      reviewer_reference: "reviewer",
      review_document: foreignTaxDocument2026("annual-review"),
      election: "credit_with_form1116",
      accounting_method: "paid",
      usd_functional_currency_without_qbu_conversion: true,
      paid_method_consistent_with_prior_elections_reviewed: true,
      all_current_foreign_tax_sources_and_owners_included: true,
      no_refund_redetermination_contested_tax_or_released_section909_tax: true,
      no_tax_payment_previously_credited_or_deducted: true,
      sources: [{
        kind: "foreign_tax_payment",
        record_reference: "paid-tax-1",
        taxpayer_tin: "123456789",
        country_name: "Switzerland",
        taxing_authority_reference: "Swiss authority",
        payment_transaction_reference: "bank-transaction-1",
        paid_or_withheld_on: "2026-06-30",
        foreign_liability_reference: "liability-2026",
        currency_code: "CHF",
        gross_tax_native: "100.25",
        source_document: foreignTaxDocument2026("payment-receipt"),
        fx: {
          rate_date: "2026-06-30",
          usd_per_currency_unit: "1.10",
          rate_source_reference: "synthetic-published-spot-rate",
          conversion_explanation:
            "Synthetic payment-date CHF/USD rate; native tax multiplied by 1.10.",
          payment_date_prevailing_rate_verified: true,
          source_document: foreignTaxDocument2026("payment-date-rate"),
        },
        complete_payment_allocation_reviewed: true,
        allocation_based_on_foreign_tax_base_by_category_reviewed: true,
        allocations: [foreignTaxAllocation2026()],
      }],
    },
  };
}
