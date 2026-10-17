import { z } from "zod";
import {
  residencePeriodSchema,
  reviewedResidencePeriodTotals,
} from "./eic-dated-residency.ts";

export const eicDeathResidencyReviewSchema = z.object({
  child_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  birth_record_reference: z.string().trim().min(1),
  death_record_reference: z.string().trim().min(1),
  death_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  us_home_residence_periods: z.array(residencePeriodSchema).min(1),
}).strict();
interface Facts {
  readonly ssn?: string;
  readonly dob: string;
  readonly months_in_home: number;
  readonly months_lived_with_you_in_us?: number;
  readonly eic_death_residency_review?: unknown;
  readonly eic_birth_residency_review?: unknown;
  readonly eic_dated_residency_review?: unknown;
}
/** Replays reviewed actual residence over the child's 2025 lifetime, with an SSN. */
export function reviewedEicDeathResidence(child: Facts): boolean {
  if (child.eic_death_residency_review === undefined) return false;
  const review = eicDeathResidencyReviewSchema.parse(
    child.eic_death_residency_review,
  );
  if (
    !child.ssn ||
    child.ssn.replaceAll("-", "") !== review.child_ssn.replaceAll("-", "") ||
    child.eic_birth_residency_review !== undefined ||
    child.eic_dated_residency_review !== undefined
  ) {
    throw new Error(
      "EIC death residence needs one matching child/SSN and consistent lifetime review",
    );
  }
  const date = (value: string): number => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) throw new Error("EIC death residence needs valid birth/death dates");
    return parsed.getTime();
  };
  const death = date(review.death_date), birth = date(child.dob);
  if (birth > death) {
    throw new Error("EIC death residence needs birth on or before death");
  }
  const firstAlive = child.dob > "2025-01-01" ? child.dob : "2025-01-01";
  const { days, months } = reviewedResidencePeriodTotals(
    review.us_home_residence_periods,
    firstAlive,
  );
  const lifeDays = (death - date(firstAlive)) / 86_400_000 + 1;
  if (
    review.us_home_residence_periods.some((period) =>
      period.end_date > review.death_date
    ) || days * 2 <= lifeDays || child.months_in_home !== months.size ||
    child.months_lived_with_you_in_us !== months.size
  ) {
    throw new Error(
      "EIC death residence needs actual home periods within more than half of 2025 life and matching months",
    );
  }
  return true;
}
