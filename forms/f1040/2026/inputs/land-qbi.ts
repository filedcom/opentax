import { z } from "zod";
import {
  finalizeLandBusinessLoss2026,
  landBusinessLossSource2026Schema,
} from "./land-business-loss.ts";
import { allocateSourceDollars2026 } from "./source-allocation.ts";

const ref = z.string().trim().min(1);
export const landQbiSource2026Schema = z.object({
  loss_sources: landBusinessLossSource2026Schema,
  review: z.object({
    record_reference: ref,
    // This explicit reviewed convention attributes a taxpayer-wide recapture
    // balance to activities; it is not represented as an IRS allocation rule.
    recapture_allocation: z.literal("positive_net_section1231_gain_proportion"),
    activities: z.array(
      z.object({
        owner_tin: z.string().regex(/^\d{9}$/),
        activity_reference: ref,
        business_name: ref,
        ein: z.string().regex(/^\d{9}$/).optional(),
        record_reference: ref,
        materially_participated: z.boolean(),
        treatment: z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("qualified"),
            domestic_section162_trade_or_business: z.literal(true),
            not_a_specified_service_trade_or_business: z.literal(true),
            no_other_section199a_exclusions_or_allocations: z.literal(true),
          }).strict(),
          z.object({
            kind: z.literal("foreign_business"),
            not_effectively_connected_with_us_trade_or_business: z.literal(
              true,
            ),
          }).strict(),
        ]),
      }).strict(),
    ).min(1),
  }).strict(),
}).strict();
export type LandQbiSource2026 = z.input<typeof landQbiSource2026Schema>;

/** Source-character contribution to QBI, not a stand-alone Form 8995 deduction.
 * The return owner must combine other current QBI, prior losses and taxable
 * income before invoking the shared deduction calculator. */
export function calculateLandQbi2026(raw: LandQbiSource2026) {
  const source = landQbiSource2026Schema.parse(raw);
  const loss = finalizeLandBusinessLoss2026(source.loss_sources);
  const land = loss.calculation.capital.land!.calculation;
  const key = (owner: string, activity: string) =>
    JSON.stringify([owner, activity]);
  const expected = new Set(
    land.rows.map((r) => key(r.source.owner_tin, r.source.activity_reference)),
  );
  const supplied = source.review.activities.map((a) =>
    key(a.owner_tin, a.activity_reference)
  );
  if (
    new Set(supplied).size !== supplied.length ||
    supplied.length !== expected.size || supplied.some((k) => !expected.has(k))
  ) {
    throw new Error("QBI review must identify every land owner/activity once");
  }
  const activities = source.review.activities.map((a) => {
    const rows = land.rows.filter((r) =>
      key(r.source.owner_tin, r.source.activity_reference) ===
        key(a.owner_tin, a.activity_reference)
    );
    return {
      ...a,
      reference: key(a.owner_tin, a.activity_reference),
      sale_references: rows.map((r) => r.source.sale_reference),
      net_section1231: rows.filter((r) => r.part === "I").reduce(
        (n, r) => n + r.printed.gain,
        0,
      ),
      short_term_ordinary: rows.filter((r) => r.part === "II").reduce(
        (n, r) => n + r.printed.gain,
        0,
      ),
    };
  });
  const recapture = allocateSourceDollars2026(
    land.line13_prior_loss_recapture,
    activities.map((a) => ({
      reference: a.reference,
      weight: Math.max(0, a.net_section1231),
    })),
  );
  const disallowedLong = allocateSourceDollars2026(
    loss.loss_attribution.disallowed_section1231_loss,
    activities.map((a) => ({
      reference: a.reference,
      weight: Math.max(0, -a.net_section1231),
    })),
  );
  const shortBucket = loss.loss_attribution.buckets.find((b) =>
    b.kind === "short_land"
  )!;
  const disallowedShort = allocateSourceDollars2026(
    shortBucket.disallowed_loss,
    activities.map((a) => ({
      reference: a.reference,
      weight: Math.max(0, -a.short_term_ordinary),
    })),
  );
  const rows = activities.map((a, i) => {
    const ordinaryLong = land.line8_net_section1231 <= 0
      ? a.net_section1231
      : recapture[i].amount;
    const suspended = disallowedLong[i].amount + disallowedShort[i].amount;
    const ordinary = ordinaryLong + a.short_term_ordinary;
    const qualified = a.treatment.kind === "qualified";
    return {
      ...a,
      ordinary_section1231: ordinaryLong,
      capital_section1231: a.net_section1231 - ordinaryLong,
      ordinary_before_limit: ordinary,
      disallowed_section1231_loss: disallowedLong[i].amount,
      disallowed_short_term_loss: disallowedShort[i].amount,
      ordinary_after_limit: ordinary + suspended,
      qbi: qualified ? ordinary + suspended : 0,
      active_qbi: qualified && a.materially_participated
        ? ordinary + suspended
        : 0,
      qualified_suspended_loss: qualified ? suspended : 0,
      nonqualified_suspended_loss: qualified ? 0 : suspended,
    };
  });
  const sum = (f: (r: typeof rows[number]) => number) =>
    rows.reduce((n, r) => n + f(r), 0);
  if (
    sum((r) => r.capital_section1231) !== land.line10_long_term_gain ||
    sum((r) => r.ordinary_before_limit) !== land.line20b_schedule1_gain_loss ||
    sum((r) => r.qualified_suspended_loss + r.nonqualified_suspended_loss) !==
      loss.loss_attribution.disallowed_section1231_loss +
        shortBucket.disallowed_loss
  ) {
    throw new Error(
      "Land QBI activity character does not reconcile to the return workpapers",
    );
  }
  return {
    source_input: source,
    loss,
    rows,
    qbi: sum((r) => r.qbi),
    active_qbi: sum((r) => r.active_qbi),
    capital_gain_excluded_from_qbi: land.line10_long_term_gain,
    qualified_suspended_loss: sum((r) => r.qualified_suspended_loss),
    nonqualified_suspended_loss: sum((r) => r.nonqualified_suspended_loss),
    // These are only the land share of the section 461(l) origin, not the
    // Form 8995 carryforward of losses allowed in the current taxable year.
    origin_tax_year: 2026 as const,
    first_carryforward_tax_year: 2027 as const,
    filing_ready: false as const,
  };
}
