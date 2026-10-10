import { z } from "zod";

export const distributionActivityReviewSchema = z.object({
  no_other_form8853_activity_confirmed: z.literal(true).optional(),
  ltc_activity_review: z.object({
    source_reference: z.string().trim().min(1),
    no_other_msa_activity_confirmed: z.literal(true),
    msa_medical_expenses_separate_from_ltc_costs_and_reimbursements_confirmed: z
      .literal(true),
  }).strict().optional(),
});

type ActivityReview = z.infer<typeof distributionActivityReviewSchema>;

export function hasExclusiveDistributionActivityReview(review: ActivityReview) {
  return !!review.no_other_form8853_activity_confirmed !==
    !!review.ltc_activity_review;
}

export function assertDistributionLtcReview(
  review: ActivityReview,
  hasLtcLedger: boolean,
) {
  if (!!review.ltc_activity_review !== hasLtcLedger) {
    throw new Error(
      "MSA distribution LTC review requires its complete LTC ledger and cannot assert absence of other activity",
    );
  }
}
