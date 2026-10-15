import { landQbiFixture2026 } from "./land-qbi.fixture.ts";
import { businessQbiFixture2026 } from "./business-qbi.fixture.ts";
import { businessLossFixture2026 } from "./business-loss.fixture.ts";
import {
  type CombinedQbiSource2026,
  resolveCombinedQbi2026,
} from "./combined-qbi.ts";
import type { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
export function combinedQbiFixture2026(
  landNet = 45000,
  cAmounts: number[] = [10000],
): CombinedQbiSource2026 {
  const land = landQbiFixture2026(landNet),
    c = businessLossFixture2026(cAmounts).business_sources!;
  const {
    prior_losses,
    no_current_qbi_sources_other_than_listed_businesses: _complete,
    ...review
  } = businessQbiFixture2026().qbi_review;
  if (cAmounts.length) land.loss_sources.loss_sources.business_sources = c;
  return {
    land_sources: land,
    ...(cAmounts.length
      ? {
        business_review: {
          ...review,
          businesses: c.businesses.map((b) => ({
            ...review.businesses[0],
            business_reference: b.business_reference,
          })),
        },
      }
      : {}),
    prior_losses,
    review: {
      record_reference: "synthetic-combined-qbi-review",
      no_current_qbi_sources_other_than_linked_land_and_schedule_c: true,
      not_a_patron_of_a_specified_cooperative: true,
      no_released_suspended_losses_or_qualified_tip_deduction: true,
      disallowed_se_allocation: "proportion_of_source_se_deduction_cents",
    },
  };
}
export function combinedQbiSelectionFixture2026(
  source = combinedQbiFixture2026(),
  agi = 100000,
): Parameters<typeof calculateDeductionSelection2026>[0] {
  const r = resolveCombinedQbi2026(source), b = r.business?.business;
  return {
    filing_status: r.land.loss.finalized_sources.filing_status,
    agi,
    standard_deduction_eligible: true,
    taxpayer_can_be_claimed_as_dependent: false,
    taxpayer_dob: "1980-06-01",
    ...(b
      ? {
        wage_income_from_agi: 0,
        dependent_earned_income: Math.max(
          0,
          b.schedule1_line3 - b.schedule1_line15,
        ),
      }
      : {}),
    capital_sources_2026: r.land.loss.finalized_sources.capital_sources,
    combined_qbi_sources_2026: source,
  };
}
