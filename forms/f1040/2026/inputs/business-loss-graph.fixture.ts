import {
  businessGraphFixture2026,
  businessQbiFixture2026,
} from "./business-qbi.fixture.ts";
import { businessLossFixture2026 } from "./business-loss.fixture.ts";
import { wage } from "./business.fixture.ts";
export function businessLossGraphFixture2026(
  amounts = [-400000],
  wages = 400000,
) {
  const f = businessGraphFixture2026(), loss = businessLossFixture2026(amounts);
  const source = {
    ...businessQbiFixture2026(),
    ...loss.business_sources!,
    qbi_review: {
      ...f.schedule_c.claim.qbi_review,
      businesses: loss.business_sources!.businesses.map((b) => ({
        ...f.schedule_c.claim.qbi_review.businesses[0],
        business_reference: b.business_reference,
      })),
    },
    loss_limit_review: {
      ...loss.review,
      qbi_loss_allocation:
        "negative_qualified_business_income_proportion" as const,
    },
  };
  const {
    filing_status: _s,
    taxpayer_tin: _t,
    spouse_tin: _sp,
    w2s: _w,
    ...claim
  } = source;
  return {
    ...f,
    schedule_c: { claim },
    w2s: [{
      ...wage("123456789", wages),
      box3_ss_wages: Math.min(wages, 184500),
      box4_ss_withheld: Math.min(wages, 184500) * .062,
    }],
  };
}
