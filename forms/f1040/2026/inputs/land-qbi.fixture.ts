import { landBusinessLossFixture2026 } from "./land-business-loss.fixture.ts";
import type { LandQbiSource2026 } from "./land-qbi.ts";
export function landQbiFixture2026(net = 45000): LandQbiSource2026 {
  return {
    loss_sources: landBusinessLossFixture2026(net),
    review: {
      record_reference: "synthetic-land-qbi-review",
      recapture_allocation: "positive_net_section1231_gain_proportion",
      activities: [{
        owner_tin: "123456789",
        activity_reference: "land-business",
        business_name: "Synthetic land business",
        record_reference: "synthetic-qualified-land-review",
        materially_participated: true,
        treatment: {
          kind: "qualified",
          domestic_section162_trade_or_business: true,
          not_a_specified_service_trade_or_business: true,
          no_other_section199a_exclusions_or_allocations: true,
        },
      }],
    },
  };
}
