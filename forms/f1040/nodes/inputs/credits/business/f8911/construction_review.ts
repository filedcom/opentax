import { z } from "zod";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Construction review needs a real calendar date");
const evidence = z.array(reference).min(1);

/** Retained reviewed facts, not independent authentication of the records. */
export const constructionReviewSchema = z.object({
  project_reference: reference,
  property_references: z.array(reference).min(1).refine((refs) =>
    new Set(refs).size === refs.length
  ),
  construction_start_date: date,
  start: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("physical_work"),
      significant_work_description: reference,
      significant_not_preliminary_work_confirmed: z.literal(true),
      source_references: evidence,
    }).strict(),
    z.object({
      method: z.literal("five_percent_safe_harbor"),
      project_total_cost: z.number().finite().positive(),
      cost_paid_or_incurred_by_start: z.number().finite().positive(),
      paid_or_incurred_tax_accounting_review_confirmed: z.literal(true),
      source_references: evidence,
    }).strict(),
  ]),
  continuity: z.object({
    method: z.enum(["continuous_construction", "continuous_efforts"]),
    through_date: date,
    satisfied_confirmed: z.literal(true),
    source_references: evidence,
  }).strict(),
  reviewed_by: reference,
  reviewed_on: date,
}).strict();

export function assertConstructionReview(
  raw: unknown,
  propertyReference: string | undefined,
  constructionBegan: string | undefined,
  placedInService: string | undefined,
) {
  const review = constructionReviewSchema.parse(raw);
  const service = date.parse(placedInService);
  if (
    !propertyReference ||
    !review.property_references.includes(propertyReference) ||
    review.construction_start_date !== constructionBegan ||
    review.construction_start_date >= "2023-01-29" ||
    review.construction_start_date > service ||
    review.continuity.through_date < service ||
    review.reviewed_on < review.continuity.through_date
  ) {
    throw new Error(
      "Form 8911 construction exception needs matching pre-January-29-2023 project evidence and continuity through service",
    );
  }
  if (
    review.start.method === "five_percent_safe_harbor" &&
    (review.start.cost_paid_or_incurred_by_start * 20 <
        review.start.project_total_cost ||
      review.start.cost_paid_or_incurred_by_start >
        review.start.project_total_cost)
  ) {
    throw new Error(
      "Form 8911 construction safe harbor needs at least five percent of total project cost",
    );
  }
  return review;
}
