import type { ForeignAssetSource2026 } from "./foreign-assets-source.ts";
import { ForeignAssetType } from "../../nodes/inputs/general/foreign/f8938/index.ts";
import { form8938UsEligibilityFixture } from "../../nodes/inputs/general/foreign/f8938/eligibility-fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

export const foreignAssetEvidence2026 = (reference: string, digit = "a") => ({
  document_reference: reference,
  document_sha256: digit.repeat(64),
});
/** Synthetic valuation records; the 2026 year-end FX observation is a fixture. */
export function foreignAssetsFixture2026(): ForeignAssetSource2026 {
  const eligibility = form8938UsEligibilityFixture();
  for (const document of Object.values(eligibility)) {
    document.reviewed_on = "2027-02-01";
  }
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    claim: {
      tax_year: 2026,
      record_reference: "foreign-asset-annual-review",
      reviewed_on: "2027-02-01",
      full_calendar_year_specified_individual_and_no_dual_resident_or_possession_exception_verified:
        true,
      complete_owner_asset_and_tax_item_inventory_verified: true,
      all_valuation_dates_needed_for_reasonable_asset_and_portfolio_maxima_reviewed:
        true,
      specified_individual_type: "us_citizen",
      annual_income_tax_return_required: true,
      residence: { location: "united_states" },
      eligibility_evidence: eligibility,
      assets: [{
        asset_id: "foreign-bank-1",
        asset_type: ForeignAssetType.DepositAccount,
        description: "CHF deposit account",
        asset_identifier: "CH-1001",
        country: "CH",
        institution_or_issuer_name: "Example Swiss Bank",
        institution_or_issuer_address: {
          line1: "10 Bankstrasse",
          city: "Zurich",
          country: "CH",
          postal_code: "8001",
        },
        owner: "taxpayer",
        currency_code: "CHF",
        ownership_and_classification_document: foreignAssetEvidence2026(
          "bank-ownership-review",
        ),
        specified_foreign_asset_and_not_excluded_account_verified: true,
        not_a_holding_already_represented_by_another_account_verified: true,
        valuation_method: "reviewed_fair_market_values",
        fx: {
          ...foreignAssetEvidence2026("synthetic-year-end-CHF-rate", "f"),
          rate_date: "2026-12-31",
          usd_per_currency_unit: 1.25,
          source: "us_treasury",
        },
        tax_items: [],
      }],
      valuation_snapshots: [{
        record_reference: "june-portfolio-observation",
        valued_on: "2026-06-30",
        observation: "contemporaneous",
        values: [{
          asset_reference: "foreign-bank-1",
          native_value: 64000,
          source_document: foreignAssetEvidence2026("june-bank-statement", "d"),
        }],
      }, {
        record_reference: "year-end-portfolio-observation",
        valued_on: "2026-12-31",
        observation: "year_end",
        values: [{
          asset_reference: "foreign-bank-1",
          native_value: 44000,
          source_document: foreignAssetEvidence2026(
            "december-bank-statement",
            "e",
          ),
        }],
      }],
      exception_forms: [],
    },
  };
}
