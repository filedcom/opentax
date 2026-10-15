import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function energyClaimFixture2026(carryforward = 8000) {
  return {
    claim: {
      tax_year: 2026 as const,
      record_reference: "synthetic-energy-inventory",
      review_reference: "synthetic-energy-review",
      no_nonrefundable_credits_other_than_child_dependent_care_and_education:
        true as const,
      prior_return: {
        tax_year: 2025 as const,
        filing_status: FilingStatus.Single,
        taxpayer_ssn: "123456789",
        return_reference: "synthetic-2025-return",
        form5695_reference: "synthetic-2025-5695",
        latest_return_and_carryforward_reviewed: true as const,
        no_ownership_allocation_required: true as const,
        line13_available_credit: carryforward + 1000,
        line14_tax_limit: 1000,
        line15_allowed_credit: 1000,
        line16_carryforward: carryforward,
      },
    },
  };
}
export function energyGraphFixture2026(
  wages = 50000,
  children = 1,
  carryforward = 8000,
) {
  const base = childCreditGraphFixture2026(wages, children);
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _absent,
    ...review
  } = base.f8812;
  const f5695 = energyClaimFixture2026(carryforward);
  return {
    ...base,
    f5695,
    f8812: {
      ...review,
      energy_inventory_reference: f5695.claim.record_reference,
    },
    ...(base.w2s
      ? {
        w2s: base.w2s.map((w) => ({
          ...w,
          box4_ss_withheld: Math.round(Math.min(wages, 184500) * .062 * 100) /
            100,
        })),
      }
      : {}),
  };
}
