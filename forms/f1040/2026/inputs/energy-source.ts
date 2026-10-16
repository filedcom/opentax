import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { computeForm5695PartIAmounts } from "../../nodes/intermediate/forms/credits/individual/form5695/index.ts";

const ref = z.string().trim().min(1);
const dollars = z.number().int().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
export const energyClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    review_reference: ref,
    no_nonrefundable_credits_other_than_child_dependent_care_and_education: z
      .literal(true).optional(),
    no_nonrefundable_credits_other_than_child_care_education_and_schedule_r: z
      .literal(true).optional(),
    schedule_r_inventory_reference: ref.optional(),
    prior_return: investmentOwner2026.extend({
      tax_year: z.literal(2025),
      return_reference: ref,
      form5695_reference: ref,
      latest_return_and_carryforward_reviewed: z.literal(true),
      no_ownership_allocation_required: z.literal(true),
      line13_available_credit: dollars,
      line14_tax_limit: dollars,
      line15_allowed_credit: dollars,
      line16_carryforward: dollars.positive(),
    }).strict(),
  }).strict(),
}).strict();
export const energySource2026Schema = investmentOwner2026.extend(
  energyClaim2026Schema.shape,
).strict();
export type EnergySource2026 = z.input<typeof energySource2026Schema>;

export function reconcileEnergySource2026(raw: EnergySource2026) {
  const source = energySource2026Schema.parse(raw);
  const c = source.claim;
  if (c.schedule_r_inventory_reference !== undefined) {
    if (
      c.no_nonrefundable_credits_other_than_child_care_education_and_schedule_r !==
        true ||
      c.no_nonrefundable_credits_other_than_child_dependent_care_and_education !==
        undefined
    ) throw Error("Energy Schedule R review is incomplete or contradictory");
  } else if (
    c.no_nonrefundable_credits_other_than_child_dependent_care_and_education !==
      true ||
    c.no_nonrefundable_credits_other_than_child_care_education_and_schedule_r !==
      undefined
  ) {
    throw Error(
      "Energy credit needs its complete nonrefundable-credit inventory",
    );
  }
  const prior = source.claim.prior_return;
  function owners(owner: z.infer<typeof investmentOwner2026>) {
    if (owner.filing_status === FilingStatus.MFJ) {
      if (!owner.spouse_ssn || owner.taxpayer_ssn === owner.spouse_ssn) {
        throw new Error(
          "Energy carryforward needs both distinct joint-return owners",
        );
      }
      return [owner.taxpayer_ssn, owner.spouse_ssn].sort().join(",");
    }
    return owner.taxpayer_ssn;
  }
  if (owners(source) !== owners(prior)) {
    throw new Error(
      "Energy carryforward ownership changed; a reviewed allocation is required",
    );
  }
  if (
    prior.line15_allowed_credit !==
      Math.min(prior.line13_available_credit, prior.line14_tax_limit) ||
    prior.line16_carryforward !==
      prior.line13_available_credit - prior.line15_allowed_credit
  ) {
    throw new Error("Prior Form 5695 lines 13-16 do not reconcile");
  }
  return source;
}

/** Tax and competing credits are internal, finalized graph sources. */
export function calculateEnergyCarryforward2026(
  raw: EnergySource2026,
  tax: number,
  earlierCredits: number,
  childCreditReserved: number,
) {
  const source = reconcileEnergySource2026(raw);
  for (const value of [tax, earlierCredits, childCreditReserved]) {
    dollars.parse(value);
  }
  const limit = Math.max(0, tax - earlierCredits - childCreditReserved);
  const amounts = computeForm5695PartIAmounts({
    prior_year_carryforward: source.claim.prior_return.line16_carryforward,
    part_i_tax_limit: limit,
  });
  return {
    source_input: source,
    tax_limit_worksheet: {
      line1: tax,
      earlier_credits: earlierCredits,
      child_credit_reserved: childCreditReserved,
      line2: earlierCredits + childCreditReserved,
      line3: limit,
    },
    lines: {
      line1: amounts.available,
      line2: limit,
      line3: amounts.allowed,
      line4: amounts.carryforwardToNextYear,
    },
    carryforward_2027: {
      tax_year: 2027 as const,
      amount: amounts.carryforwardToNextYear,
      source_reference: source.claim.record_reference,
      prior_return_reference: source.claim.prior_return.return_reference,
      taxpayer_ssn: source.taxpayer_ssn,
      spouse_ssn: source.filing_status === FilingStatus.MFJ
        ? source.spouse_ssn
        : undefined,
    },
    file_form5695: true,
  };
}
