import { z } from "zod";
import { bonusAssetCoreSchema } from "./bonus.ts";

export const bonusElectionReviewSchema = z.object({
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  elected_out_recovery_periods: z.array(
    bonusAssetCoreSchema.shape.macrs_recovery_period_years,
  ),
  reduced_bonus_40_percent: z.boolean(),
  taxpayer_authorized_confirmed: z.literal(true),
  timely_original_return_confirmed: z.literal(true),
  filing_timeliness_review_reference: z.string().trim().min(1),
  election_review_reference: z.string().trim().min(1),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

const electionAssetFactsSchema = bonusAssetCoreSchema.pick({
  proprietor_ssn: true,
  macrs_recovery_period_years: true,
}).extend({
  acquired_date: z.string(),
  bonus_elected_out: z.boolean(),
  reduced_bonus_election: z.boolean(),
});
type ElectionAssets = readonly z.infer<typeof electionAssetFactsSchema>[];
type ElectionReview = z.infer<typeof bonusElectionReviewSchema>;

export function assertBonusElections(
  assets: ElectionAssets,
  review?: ElectionReview,
): void {
  if (!review) {
    if (assets.some((a) => a.bonus_elected_out || a.reduced_bonus_election)) {
      throw new Error(
        "Bonus elections need the taxpayer's complete reviewed election source",
      );
    }
    return;
  }
  const date = new Date(`${review.reviewed_on}T00:00:00Z`);
  const classes = review.elected_out_recovery_periods;
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== review.reviewed_on ||
    new Set(classes).size !== classes.length ||
    (!classes.length && !review.reduced_bonus_40_percent) ||
    classes.some((period) =>
      !assets.some((a) => a.macrs_recovery_period_years === period)
    ) ||
    assets.some((a) => a.proprietor_ssn !== review.proprietor_ssn)
  ) {
    throw new Error(
      "Bonus election review needs a real date, owner and distinct present property classes",
    );
  }
  if (
    review.reduced_bonus_40_percent &&
    !assets.some((a) =>
      a.acquired_date > "2025-01-19" &&
      !classes.includes(a.macrs_recovery_period_years)
    )
  ) {
    throw new Error(
      "Reduced bonus election needs qualifying post-January-19 property",
    );
  }
  for (const asset of assets) {
    const optedOut = classes.includes(asset.macrs_recovery_period_years);
    const reduced = !optedOut && review.reduced_bonus_40_percent &&
      asset.acquired_date > "2025-01-19";
    if (
      asset.bonus_elected_out !== optedOut ||
      asset.reduced_bonus_election !== reduced
    ) {
      throw new Error(
        "Bonus election flags must match every class and eligible asset across the complete return inventory",
      );
    }
  }
}

export function bonusElectionTexts(
  assets: ElectionAssets,
  review?: ElectionReview,
) {
  assertBonusElections(assets, review);
  if (!review) return { optedOut: undefined, reduced: undefined };
  const periods = [...review.elected_out_recovery_periods].sort((a, b) =>
    a - b
  );
  return {
    optedOut: periods.length
      ? `For the calendar tax year ending December 31, 2025, the taxpayer elects under IRC section 168(k)(7) not to claim any special depreciation allowance for all property in the following classes placed in service during the tax year: ${
        periods.map((p) => `${p}-year property`).join(", ")
      }. This election applies across all of the taxpayer's business activities.`
      : undefined,
    reduced: review.reduced_bonus_40_percent
      ? "For the calendar tax year ending December 31, 2025, the taxpayer elects under IRC section 168(k)(10), following Notice 2026-11 section 4.03, to deduct 40 percent instead of 100 percent additional first-year depreciation for all qualifying property acquired after January 19, 2025 and placed in service during this tax year. Property classes separately elected out under section 168(k)(7) receive no special depreciation allowance."
      : undefined,
  };
}
