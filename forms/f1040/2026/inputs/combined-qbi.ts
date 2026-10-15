import { z } from "zod";
import { calculateLandQbi2026, landQbiSource2026Schema } from "./land-qbi.ts";
import {
  businessQbiComponentReview2026Schema,
  resolveBusinessQbiComponents2026,
} from "./business-qbi.ts";
import {
  qbiPriorLoss2026Schema,
  resolveQbiPriorLoss2026,
  simplifiedQbiCalculator2026,
} from "./qbi-common.ts";
import { allocateSourceUnits2026 } from "./source-allocation.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1);
export const combinedQbiSource2026Schema = z.object({
  land_sources: landQbiSource2026Schema,
  business_review: businessQbiComponentReview2026Schema.optional(),
  prior_losses: qbiPriorLoss2026Schema,
  review: z.object({
    record_reference: ref,
    no_current_qbi_sources_other_than_linked_land_and_schedule_c: z.literal(
      true,
    ),
    not_a_patron_of_a_specified_cooperative: z.literal(true),
    no_released_suspended_losses_or_qualified_tip_deduction: z.literal(true),
    disallowed_se_allocation: z.literal(
      "proportion_of_source_se_deduction_cents",
    ),
  }).strict(),
}).strict();
export type CombinedQbiSource2026 = z.input<typeof combinedQbiSource2026Schema>;

/** One current QBI inventory, one prior loss and one reconciled 461 origin. */
export function resolveCombinedQbi2026(raw: CombinedQbiSource2026) {
  const source = combinedQbiSource2026Schema.parse(raw),
    land = calculateLandQbi2026(source.land_sources);
  const loss = land.loss, rawBusiness = loss.finalized_sources.business_sources;
  if (Boolean(rawBusiness) !== Boolean(source.business_review)) {
    throw new Error(
      "Combined QBI needs exactly one Schedule C component review when C sources exist",
    );
  }
  const business = rawBusiness
    ? resolveBusinessQbiComponents2026(rawBusiness, source.business_review!)
    : undefined;
  const owner = loss.finalized_sources;
  const prior = resolveQbiPriorLoss2026(source.prior_losses, {
    filing_status: owner.filing_status,
    taxpayer_tin: owner.taxpayer_ssn,
    spouse_tin: owner.filing_status === FilingStatus.MFJ
      ? owner.spouse_ssn
      : undefined,
  });
  const allocations = loss.loss_attribution.buckets;
  const seDisallowed = new Map<string, number>();
  for (const o of business?.business.owners ?? []) {
    const bucket = allocations.find((b) =>
      b.kind === "deductible_half_se" && b.owner_tin === o.owner_tin
    )!;
    const rows = business!.rows.filter((r) => r.owner_tin === o.owner_tin);
    const shares = allocateSourceUnits2026(
      bucket.disallowed_loss * 100,
      rows.map((r) => ({
        reference: r.business_reference,
        weight: Math.round(r.allocated_se_deduction * 100),
      })),
    );
    for (const share of shares) {
      seDisallowed.set(share.reference, share.amount / 100);
    }
  }
  const businessRows = (business?.rows ?? []).map((r) => {
    const ordinary = allocations.find((b) =>
      b.kind === "schedule_c" && b.owner_tin === r.owner_tin &&
      b.activity_reference === r.business_reference
    )?.disallowed_loss ?? 0;
    const se = seDisallowed.get(r.business_reference) ?? 0;
    const cents = Math.round(r.qbi_before_rounding * 100) + ordinary * 100 +
      Math.round(se * 100);
    return {
      ...r,
      source_kind: "schedule_c" as const,
      allocated_excess_business_loss: ordinary,
      allocated_disallowed_se_deduction: se,
      qbi_before_rounding: cents / 100,
      qbi: roundWholeDollars(cents / 100),
    };
  });
  const landRows = land.rows.filter((r) => r.treatment.kind === "qualified")
    .map((r) => ({
      source_kind: "land" as const,
      business_reference: r.activity_reference,
      owner_tin: r.owner_tin,
      business_name: r.business_name,
      identification_number: r.ein ?? r.owner_tin,
      qbi_before_rounding: r.qbi,
      qbi: r.qbi,
      materially_participated: r.materially_participated,
      allocated_excess_business_loss: r.qualified_suspended_loss,
      allocated_disallowed_se_deduction: 0,
    }));
  const rows = [...businessRows, ...landRows];
  const cDisallowed = allocations.filter((b) =>
    b.kind === "schedule_c" || b.kind === "deductible_half_se"
  ).reduce((n, b) => n + b.disallowed_loss, 0);
  const qualifiedSuspended = cDisallowed + land.qualified_suspended_loss;
  if (
    qualifiedSuspended + land.nonqualified_suspended_loss !==
      loss.calculation.schedule1_line8p
  ) {
    throw new Error(
      "Qualified and nonqualified loss origins must reconcile to Form 461",
    );
  }
  const active = (business?.active_qbi_before_rounding ?? 0) + cDisallowed +
    land.active_qbi;
  return {
    source_input: source,
    land,
    business,
    rows,
    qbi: rows.reduce((n, r) => n + r.qbi, 0),
    active_qbi_before_rounding: active,
    minimum_deduction: active >= 1000 ? 400 : 0,
    ...prior,
    loss_attribution: {
      source_reference: loss.source_input.record_reference,
      review_reference: source.review.record_reference,
      source_bucket_method: loss.loss_attribution.method,
      disallowed_se_allocation: source.review.disallowed_se_allocation,
      excess_business_loss: loss.calculation.schedule1_line8p,
      qualified_suspended_loss: qualifiedSuspended,
      nonqualified_suspended_loss: land.nonqualified_suspended_loss,
      origin_tax_year: 2026 as const,
      first_carryforward_tax_year: 2027 as const,
      kind: "section461l_nol_origin" as const,
      // Retain source buckets as well as rows; 8995 line 18 contains only allowed loss.
      source_buckets: allocations,
    },
    filing_ready: false as const,
  };
}
export function combinedQbiCalculator2026(raw: CombinedQbiSource2026) {
  const r = resolveCombinedQbi2026(raw), c = r.land.loss.calculation.capital;
  return simplifiedQbiCalculator2026(
    r,
    c.source_input.filing_status,
    c.preferential_gain + c.qualified_dividends,
  );
}
