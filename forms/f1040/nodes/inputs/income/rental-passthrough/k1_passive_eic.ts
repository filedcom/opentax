import { z } from "zod";

const activityKind = z.enum(["passive", "nonpassive"]);

/** Classification of the three Schedule E Part II K-1 income boxes. */
export const k1PassiveEicReviewSchema = z.object({
  box1: activityKind.optional(),
  box2: activityKind.optional(),
  box3: activityKind.optional(),
  recipient_tin: z.string().regex(/^\d{9}$/),
  partnership_not_publicly_traded_verified: z.literal(true).optional(),
  activity_statement_reference: z.string().trim().min(1),
  participation_workpaper_reference: z.string().trim().min(1),
}).strict();

export type K1PassiveEicReview = z.infer<typeof k1PassiveEicReviewSchema>;

export interface K1PassiveEicItem {
  readonly box1_ordinary_business?: number;
  readonly box2_rental_re?: number;
  readonly box3_other_rental?: number;
  readonly eic_passive_activity_review?: K1PassiveEicReview;
}

const boxes = [
  ["box1", "box1_ordinary_business"],
  ["box2", "box2_rental_re"],
  ["box3", "box3_other_rental"],
] as const;

export function reviewedK1PassiveIncome(
  items: readonly K1PassiveEicItem[],
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      boxes.reduce((row, [reviewKey, amountKey]) =>
        row + (item.eic_passive_activity_review?.[reviewKey] === "passive"
          ? Math.max(0, item[amountKey] ?? 0)
          : 0), 0),
    0,
  );
}

/** A positive EIC needs every K-1 activity's passive status from its statement. */
export function assertK1EicReview(
  items: readonly K1PassiveEicItem[],
): void {
  for (const item of items) {
    for (const [reviewKey, amountKey] of boxes) {
      const amount = item[amountKey] ?? 0;
      if (amount < 0) {
        throw new Error(
          "Form 1040 EIC K-1 loss needs a finalized Schedule E and Form 8582 route",
        );
      }
      if (
        amount > 0 &&
        item.eic_passive_activity_review?.[reviewKey] === undefined
      ) {
        throw new Error(
          `Form 1040 EIC K-1 ${reviewKey} needs reviewed passive classification`,
        );
      }
    }
  }
}
