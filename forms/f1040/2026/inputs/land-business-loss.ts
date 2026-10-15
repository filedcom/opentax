import { z } from "zod";
import { allocateSourceDollars2026 } from "./source-allocation.ts";
import {
  businessLossSource2026Schema,
  calculateBusinessLoss2026,
  calculateBusinessLossAmounts2026,
} from "./business-loss-source.ts";

const ref = z.string().trim().min(1);
export const landBusinessLossSource2026Schema = z.object({
  record_reference: ref,
  loss_sources: businessLossSource2026Schema,
  allocation_review: z.object({
    record_reference: ref,
    // Reviewed bookkeeping convention, not an IRS-prescribed attribution rule.
    method: z.literal("negative_form461_source_bucket_proportion"),
    land_activities: z.array(
      z.object({
        owner_tin: z.string().regex(/^\d{9}$/),
        activity_reference: ref,
        record_reference: ref,
        farming_business: z.boolean(),
        no_other_current_income_deductions_or_suspended_items: z.literal(true),
      }).strict(),
    ).min(1),
  }).strict(),
}).strict();
export type LandBusinessLossSource2026 = z.input<
  typeof landBusinessLossSource2026Schema
>;

type Bucket = {
  reference: string;
  owner_tin?: string;
  activity_reference?: string;
  kind: "schedule_c" | "deductible_half_se" | "net_section1231" | "short_land";
  amount: number;
};

function allocateDisallowedLoss(buckets: Bucket[], excess: number) {
  const shares = allocateSourceDollars2026(
    excess,
    buckets.map((b) => ({
      reference: b.reference,
      weight: Math.max(0, -b.amount),
    })),
  );
  return buckets.map((b, i) => ({
    ...b,
    loss_before_limit: shares[i].weight,
    disallowed_loss: shares[i].amount,
    allowed_loss: shares[i].weight - shares[i].amount,
    amount_after_limit: b.amount + shares[i].amount,
  }));
}

/**
 * Sources -> preliminary capital/4797 -> Form 461 -> reviewed attribution ->
 * finalized 1231 history -> replayed capital/461 destinations.
 * No user-entered deductible loss or previous placeholder history is consumed.
 * Full Form 172 and qualified/nonqualified NOL attribution remain separate.
 */
export function finalizeLandBusinessLoss2026(raw: LandBusinessLossSource2026) {
  const source = landBusinessLossSource2026Schema.parse(raw);
  const preliminary = calculateBusinessLossAmounts2026(source.loss_sources);
  const land = preliminary.capital.land;
  if (!land) {
    throw new Error("Land loss finalization requires disposition sources");
  }
  const key = (owner: string, activity: string) =>
    JSON.stringify([owner, activity]);
  const expected = new Set(
    land.calculation.rows.map((r) =>
      key(r.source.owner_tin, r.source.activity_reference)
    ),
  );
  const activities = source.allocation_review.land_activities;
  const supplied = activities.map((a) =>
    key(a.owner_tin, a.activity_reference)
  );
  if (
    new Set(supplied).size !== supplied.length ||
    supplied.length !== expected.size ||
    supplied.some((k) => !expected.has(k))
  ) {
    throw new Error(
      "Loss reviews must identify every land owner/activity once",
    );
  }
  const farming = new Set(
    activities.filter((a) => a.farming_business).map((a) =>
      key(a.owner_tin, a.activity_reference)
    ),
  );
  const excess = preliminary.schedule1_line8p;
  if (
    excess > 0 && land.calculation.rows.some((r) =>
      r.printed.gain < 0 &&
      farming.has(key(r.source.owner_tin, r.source.activity_reference))
    )
  ) {
    throw new Error(
      "Farm loss attribution requires Form 172 and farming-first threshold allocation",
    );
  }
  const buckets: Bucket[] = preliminary.business_rows.filter((r) =>
    !r.employee_service
  )
    .map((r) => ({
      reference: `schedule_c:${key(r.owner_tin, r.activity_reference)}`,
      owner_tin: r.owner_tin,
      activity_reference: r.activity_reference,
      kind: "schedule_c",
      amount: r.amount,
    }));
  for (const owner of preliminary.business?.owners ?? []) {
    buckets.push({
      reference: `half_se:${owner.owner_tin}`,
      owner_tin: owner.owner_tin,
      kind: "deductible_half_se",
      amount: -(owner.schedule_se?.line13 ?? 0),
    });
  }
  buckets.push({
    reference: "land:net_section1231",
    kind: "net_section1231",
    // Positive net gains contribute only their ordinary recapture here.
    // The capped capital portion already offsets the Form 461 loss separately.
    amount: land.calculation.line12_section1231_loss +
      land.calculation.line13_prior_loss_recapture,
  }, {
    reference: "land:short_term",
    kind: "short_land",
    amount: land.calculation.short_term_ordinary_gain_loss,
  });
  const sourceTotal = buckets.reduce((n, b) => n + b.amount, 0) +
    preliminary.capital_classification.included_business_capital_gain;
  if (sourceTotal !== preliminary.lines.line14) {
    throw new Error(
      "Loss allocation buckets disagree with Form 461 business sources",
    );
  }
  const allocations = allocateDisallowedLoss(buckets, excess);
  const section = allocations.find((b) => b.kind === "net_section1231")!;
  const finalizedLoss = land.calculation.line8_net_section1231 < 0
    ? {
      amount_taken_into_account: section.allowed_loss,
      finalized_limitation_workpaper_reference: source.record_reference,
    }
    : undefined;
  const finalizedSources = {
    ...preliminary.source_input,
    capital_sources: {
      ...preliminary.capital.source_input,
      land_sources_2026: {
        ...land.source_input,
        ...(finalizedLoss ? { finalized_loss: finalizedLoss } : {}),
      },
    },
  };
  const final = calculateBusinessLoss2026(finalizedSources);
  if (
    JSON.stringify(final.lines) !== JSON.stringify(preliminary.lines) ||
    final.capital.return_gain !== preliminary.capital.return_gain ||
    final.capital.line11_form4797 !== preliminary.capital.line11_form4797 ||
    final.capital.ordinary_disposition_gain_loss !==
      preliminary.capital.ordinary_disposition_gain_loss
  ) {
    throw new Error(
      "Finalized history changed the preliminary tax destinations",
    );
  }
  return {
    source_input: source,
    preliminary,
    finalized_loss: finalizedLoss,
    // Return the parsed final inventory, including canonical nested key order,
    // so downstream source comparisons use the same schema-normalized records.
    finalized_sources: final.source_input,
    calculation: final,
    loss_attribution: {
      source_reference: source.record_reference,
      review_reference: source.allocation_review.record_reference,
      method: source.allocation_review.method,
      activities,
      buckets: allocations,
      excess_business_loss: excess,
      disallowed_section1231_loss: section.disallowed_loss,
      allowed_section1231_loss: section.allowed_loss,
      // This separates actual 2026 deductions from loss origins; it is not a
      // complete Form 172 or a qualified NOL carryforward for Form 8995.
      qualified_nol_attribution_pending: true as const,
    },
    filing_ready: false as const,
  };
}
