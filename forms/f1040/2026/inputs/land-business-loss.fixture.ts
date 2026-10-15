import { businessLossFixture2026 } from "./business-loss.fixture.ts";
import { landCapitalFixture2026 } from "./land-capital.fixture.ts";
import type { LandBusinessLossSource2026 } from "./land-business-loss.ts";

export function landBusinessLossFixture2026(
  net = -400000,
): LandBusinessLossSource2026 {
  const loss = businessLossFixture2026();
  delete loss.business_sources;
  loss.capital_sources = landCapitalFixture2026();
  loss.capital_sources.claim!.sales = [];
  const sale = loss.capital_sources.land_sources_2026!.source.claim.sales[0];
  sale.activity_reference = "land-business";
  sale.description = "Synthetic business land";
  sale.purchase_price = net < 0 ? 100000 - net : 100000;
  sale.closing.gross_sales_price = net < 0 ? 100000 : 100000 + net;
  sale.closing.selling_expenses = [];
  delete loss.capital_sources.land_sources_2026!.niit_review;
  return {
    record_reference: "synthetic-land-loss-owner",
    loss_sources: loss,
    allocation_review: {
      record_reference: "synthetic-loss-allocation-review",
      method: "negative_form461_source_bucket_proportion",
      land_activities: [{
        owner_tin: "123456789",
        activity_reference: "land-business",
        record_reference: "synthetic-land-activity-review",
        farming_business: false,
        no_other_current_income_deductions_or_suspended_items: true,
      }],
    },
  };
}
