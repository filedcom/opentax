import { FilingStatus } from "../../nodes/types.ts";
import type { Section1231History2026 } from "./section1231-history.ts";
import type { LandDispositionSource2026 } from "./land-disposition-source.ts";
export function section1231HistoryFixture2026(): Section1231History2026 {
  return {
    tax_year: 2026,
    owner: { taxpayer_ssn: "123456789" },
    opening_period_source_reference: "synthetic-2020-closing-ledger",
    opening_period_losses: [{ loss_year: 2020, remaining_loss: 4000 }],
    filed_years: [-6000, 0, 0, 3000, 2000].map((net, i) => ({
      tax_year: 2021 + i,
      owner: { taxpayer_ssn: "123456789" },
      filed_return_reference: `synthetic-return-${2021 + i}`,
      source_document_reference: `synthetic-4797-${2021 + i}`,
      filed_line7_net_gain_loss: net,
      section1231_loss_taken_into_account: Math.max(0, -net),
      ...(i === 3
        ? {
          filed_line8_nonrecaptured_loss: 10000,
          filed_line12_recaptured_gain: 3000,
        }
        : {}),
      ...(i === 4
        ? {
          filed_line8_nonrecaptured_loss: 7000,
          filed_line12_recaptured_gain: 2000,
        }
        : {}),
    })),
  };
}
export function landDispositionFixture2026(): LandDispositionSource2026 {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "123456789",
    claim: {
      tax_year: 2026,
      record_reference: "synthetic-land-inventory",
      review_reference: "synthetic-land-review",
      all_dispositions_and_section1231_items_included: true,
      no_other_section1231_sources_or_casualties: true,
      no_passive_or_at_risk_limitations: true,
      prior_history: section1231HistoryFixture2026(),
      sales: [{
        sale_reference: "sale-1",
        information_return: {
          kind: "none",
          review_reference: "synthetic-information-return-review",
          no_information_return_received: true,
        },
        owner_tin: "123456789",
        property_reference: "parcel-1",
        activity_reference: "farm-1",
        description: "Synthetic farmland",
        nondepreciable_business_land_only: true,
        business_use_entire_ownership_period: true,
        full_interest_disposed: true,
        no_section1252_1254_or1255_recapture: true,
        no_related_party_installment_exchange_or_nonrecognition: true,
        acquired_on: "2015-06-01",
        acquisition_record_reference: "purchase-1",
        purchase_price: 50000,
        capitalized_acquisition_costs: [],
        basis_adjustments: [],
        closing: {
          settled_on: "2026-06-02",
          closing_record_reference: "closing-1",
          gross_sales_price: 100000,
          all_consideration_and_assumed_debt_included: true,
          selling_expenses: [{
            record_reference: "commission-1",
            date: "2026-06-02",
            description: "Commission",
            amount: 5000,
          }],
        },
      }],
    },
  };
}
