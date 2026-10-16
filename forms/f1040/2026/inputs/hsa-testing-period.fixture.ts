import { hsaExcessReturns2026 } from "./hsa-excess-returns.fixture.ts";
import { hsaQualifiedFunding2026 } from "./hsa-qualified-funding.fixture.ts";
import type { HsaTestingPeriod2026 } from "./hsa-testing-period.ts";
export function hsaTestingPeriod2026(transfer = true): HsaTestingPeriod2026 {
  const s = hsaExcessReturns2026(), f = s.excess_returns!.contribution_sources;
  if (transfer) {
    const q = hsaQualifiedFunding2026();
    f.qualified_funding_review = q.qualified_funding_review;
    f.claim.accounts[0].receipts.push(q.claim.accounts[0].receipts.at(-1)!);
    f.claim.accounts[0].form5498sa.box2_calendar_year_contributions += 1000;
  }
  const m = f.household_eligibility.owners[0].months[0];
  return {
    ...s,
    excess_returns: s.excess_returns!,
    history_review: {
      record_reference: "annual-history",
      reviewed_on: "2027-05-31",
      owners: [{
        owner_tin: s.taxpayer_ssn,
        prior_excess: {
          kind: "none",
          history_review_reference: "prior-excess-review",
          no_unresolved_prior_hsa_excess_verified: true,
        },
      }],
    },
    testing_review: {
      record_reference: "testing-review",
      reviewed_on: "2027-05-31",
      owners: [{
        owner_tin: s.taxpayer_ssn,
        history_reference: "testing-history",
        no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified:
          true,
        complete_dated_coverage_changes_including_midmonth_and_retroactive_changes_verified:
          true,
        failure_cause: {
          kind: "ordinary",
          review_reference: "failure-cause",
          no_death_or_disability_caused_eligibility_failure_verified: true,
        },
        periods: [{
          record_reference: "annual-continuity",
          effective_from: "2026-01-01",
          effective_through: "2026-12-31",
          medicare: structuredClone(m.medicare),
          other_coverage: structuredClone(m.other_coverage),
        }],
      }],
    },
  };
}
