import { z } from "zod";
import { bonusAssetCoreSchema } from "./bonus.ts";

export enum DepreciationMethod {
  DoubleDeclining = "200 DB",
  Declining150 = "150 DB",
  StraightLine = "S/L",
}

export const methodElectionReviewSchema = z.object({
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  classes: z.array(
    z.object({
      recovery_period: bonusAssetCoreSchema.shape.macrs_recovery_period_years,
      method: z.union([
        z.literal(DepreciationMethod.Declining150),
        z.literal(DepreciationMethod.StraightLine),
      ]),
    }).strict(),
  ).min(1),
  taxpayer_authorized_confirmed: z.literal(true),
  timely_original_return_confirmed: z.literal(true),
  filing_timeliness_review_reference: z.string().trim().min(1),
  election_review_reference: z.string().trim().min(1),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();
const methodAssetFactsSchema = bonusAssetCoreSchema.pick({
  proprietor_ssn: true,
  macrs_recovery_period_years: true,
}).extend({ no_depreciation_method_election: z.boolean() });
type Review = z.infer<typeof methodElectionReviewSchema>;

export function assertMethodElections(
  assets: readonly z.infer<typeof methodAssetFactsSchema>[],
  review?: Review,
): void {
  if (!review) {
    if (assets.some((a) => !a.no_depreciation_method_election)) {
      throw new Error(
        "MACRS method elections need a reviewed taxpayer election",
      );
    }
    return;
  }
  const date = new Date(`${review.reviewed_on}T00:00:00Z`);
  const periods = review.classes.map((c) => c.recovery_period);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== review.reviewed_on ||
    new Set(periods).size !== periods.length ||
    review.classes.some((c) =>
      !assets.some((a) =>
        a.macrs_recovery_period_years === c.recovery_period
      ) ||
      (c.method === DepreciationMethod.Declining150 && c.recovery_period >= 15)
    ) ||
    assets.some((a) =>
      a.proprietor_ssn !== review.proprietor_ssn ||
      a.no_depreciation_method_election ===
        periods.includes(a.macrs_recovery_period_years)
    )
  ) {
    throw new Error(
      "MACRS method election needs a real review date and distinct eligible classes covering every owner asset",
    );
  }
}

export function currentYearMethod(period: number, review?: Review) {
  return review?.classes.find((c) => c.recovery_period === period)?.method ??
    (period < 15
      ? DepreciationMethod.DoubleDeclining
      : DepreciationMethod.Declining150);
}
