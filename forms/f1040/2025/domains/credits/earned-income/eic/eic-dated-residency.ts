import { z } from "zod";

export const residencePeriodSchema = z.object({
  start_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  record_reference: z.string().trim().min(1),
  child_lived_with_filer_in_us_verified: z.literal(true),
}).strict();

export const eicDatedResidencyReviewSchema = z.object({
  child_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  residence_periods: z.array(residencePeriodSchema).min(1),
}).strict();

interface DatedResidencyFacts {
  readonly ssn?: string;
  readonly dob: string;
  readonly months_in_home: number;
  readonly months_lived_with_you_in_us?: number;
  readonly eic_dated_residency_review?: unknown;
}

/** Replays actual 2025 U.S. home intervals; references are reviewed facts, not authentication. */
export function reviewedEicDatedResidence(child: DatedResidencyFacts): boolean {
  if (child.eic_dated_residency_review === undefined) return false;
  const review = eicDatedResidencyReviewSchema.parse(
    child.eic_dated_residency_review,
  );
  if (
    !child.ssn ||
    review.child_ssn.replaceAll("-", "") !== child.ssn.replaceAll("-", "") ||
    child.dob >= "2025-01-01"
  ) {
    throw new Error(
      "EIC dated residence needs the matching child born before 2025",
    );
  }
  const { days, months } = reviewedResidencePeriodTotals(
    review.residence_periods,
  );
  if (
    days * 2 <= 365 || child.months_lived_with_you_in_us !== months.size ||
    child.months_in_home < months.size
  ) {
    throw new Error(
      "EIC dated residence needs more than half-year U.S. days and matching actual months",
    );
  }
  return true;
}

/** Exact, nonoverlapping actual U.S. home periods within 2025. */
export function reviewedResidencePeriodTotals(
  input: unknown,
  earliestDate = "2025-01-01",
) {
  const residence_periods = residencePeriodSchema.array().min(1).parse(input);
  const date = (value: string): number => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("EIC dated residence needs valid 2025 dates");
    }
    return parsed.getTime();
  };
  const periods = residence_periods.map((period) => ({
    start: date(period.start_date),
    end: date(period.end_date),
  })).sort((a, b) => a.start - b.start);
  const earliest = date(earliestDate);
  if (periods.some((period) => period.start < earliest)) {
    throw new Error("EIC residence period starts before the child was alive");
  }
  let days = 0;
  let previousEnd = -Infinity;
  const months = new Set<number>();
  for (const period of periods) {
    if (period.end < period.start || period.start <= previousEnd) {
      throw new Error(
        "EIC dated residence needs ordered nonoverlapping home periods",
      );
    }
    days += (period.end - period.start) / 86_400_000 + 1;
    for (let day = period.start; day <= period.end; day += 86_400_000) {
      months.add(new Date(day).getUTCMonth());
    }
    previousEnd = period.end;
  }
  return { days, months };
}
