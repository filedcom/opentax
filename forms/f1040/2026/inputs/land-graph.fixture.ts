import { combinedQbiFixture2026 } from "./combined-qbi.fixture.ts";
import { businessGraphFixture2026 } from "./business-qbi.fixture.ts";
import { landCapitalFixture2026 } from "./land-capital.fixture.ts";
import { wage } from "./business.fixture.ts";
import type { z } from "zod";
import { landDispositionClaimInput2026Schema } from "../nodes/land-dispositions.ts";
import type { businessClaimInput2026Schema } from "../nodes/business.ts";

export function landGraphFixture2026(
  net = 45000,
  cAmounts = [10000],
  wages = 40000,
) {
  const combined = combinedQbiFixture2026(net, cAmounts),
    loss = combined.land_sources.loss_sources,
    capital = loss.loss_sources.capital_sources,
    bridge = capital.land_sources_2026!,
    base = businessGraphFixture2026();
  const niit = landCapitalFixture2026().land_sources_2026!.niit_review!;
  niit.activities[0].activity_reference = "land-business";
  niit.activities[0].business_name = "Synthetic land business";
  const land: z.input<typeof landDispositionClaimInput2026Schema> = {
    claim: {
      dispositions: bridge.source.claim,
      reconciliation: bridge.reconciliation,
      niit_review: niit,
      loss_review: loss.loss_sources.review,
      loss_allocation_review: loss.allocation_review,
      land_qbi_review: combined.land_sources.review,
      combined_qbi_review: combined.review,
      prior_qbi_losses: combined.prior_losses,
    },
  };
  let schedule_c: z.input<typeof businessClaimInput2026Schema> | undefined;
  if (loss.loss_sources.business_sources) {
    const {
      filing_status: _s,
      taxpayer_tin: _t,
      spouse_tin: _sp,
      w2s: _w,
      ...core
    } = loss.loss_sources.business_sources;
    schedule_c = {
      claim: {
        ...core,
        qbi_review: {
          ...combined.business_review!,
          no_current_qbi_sources_other_than_listed_businesses: false,
          linked_land_qbi_inventory_reference:
            bridge.source.claim.record_reference,
          prior_losses: combined.prior_losses,
        },
      },
    };
  }
  return {
    general: base.general,
    w2s: wages
      ? [{
        ...wage("123456789", wages),
        box3_ss_wages: Math.min(wages, 184500),
        box4_ss_withheld: Math.min(wages, 184500) * .062,
      }]
      : [],
    ...(schedule_c ? { schedule_c } : {}),
    capital_gains: { claim: capital.claim! },
    land_dispositions: land,
  };
}
