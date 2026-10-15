import { landDispositionFixture2026 } from "./land-disposition.fixture.ts";
import type { Form1062Election2026 } from "./form1062-source.ts";
export function form1062Fixture2026() {
  const land = landDispositionFixture2026(), sale = land.claim.sales[0];
  const election: Form1062Election2026 = {
    tax_year: 2026,
    record_reference: "synthetic-1062-election",
    land_inventory_reference: land.claim.record_reference,
    review_reference: "synthetic-election-review",
    elected_sale_inventory_complete: true,
    sales: [{
      sale_reference: sale.sale_reference,
      property_reference: sale.property_reference,
      owner_tin: sale.owner_tin,
      elect_section1062: true,
      location: {
        state: "IA",
        county_or_locality: "Synthetic County",
        legal_description_reference: "synthetic-deed",
        real_property_in_the_united_states: true,
      },
      farming_history: {
        record_reference: "synthetic-use-history",
        periods: [{
          record_reference: "synthetic-farm-records",
          from: "2015-06-01",
          through: "2026-06-02",
          purpose: "cultivate_raise_or_harvest_commodities",
          use: { kind: "taxpayer_farm" },
        }],
        substantially_all_ten_years_review: {
          record_reference: "synthetic-use-review",
          substantially_all_period_qualifies: true,
        },
      },
      buyer: {
        name: "Synthetic Farmer",
        tin: "234567891",
        record_reference: "synthetic-buyer-review",
        individual_actively_engaged_under_7usc1308_1_b_and_c: true,
      },
      covenant: {
        document_reference: "synthetic-covenant",
        sha256: "a".repeat(64),
        property_reference: sale.property_reference,
        seller_tin: sale.owner_tin,
        buyer_tin: "234567891",
        executed_on: "2026-06-02",
        effective_from: "2026-06-03",
        effective_through: "2036-06-02",
        legal_review_reference: "synthetic-covenant-review",
        legally_enforceable_on_sale_date: true,
        prohibits_all_nonfarming_use_during_required_period: true,
        covers_entire_disposed_property: true,
      },
    }],
  };
  return { land, election };
}
