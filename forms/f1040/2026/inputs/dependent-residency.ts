import { z } from "zod";

const reference = z.string().trim().min(1);
const date = z.string().date();
export const residency2026Schema = z.object({
  tax_year: z.literal(2026),
  source_reference: reference,
  periods: z.array(
    z.object({
      from: date,
      through: date,
      in_us: z.boolean(),
      record_reference: reference,
      // Reviewed temporary absences are part of the child's home period.
      temporary_absence_reason: z.enum([
        "illness",
        "education",
        "vacation",
        "business",
        "military",
        "juvenile_detention",
      ]).optional(),
    }).strict(),
  ).min(1),
  all_home_periods_reviewed: z.literal(true),
  birth_record_reference: reference.optional(),
  death_record_reference: reference.optional(),
}).strict();

export interface ResidenceFacts2026 {
  dob: string;
  death_date?: string;
  months_in_home: number;
  months_lived_with_you_in_us?: number;
  lived_in_us_over_half_year?: boolean;
  residency_2026_review?: z.input<typeof residency2026Schema>;
}
const day = 86_400_000;
export function validDate2026(value: string, name: string): number {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value || value > "2026-12-31"
  ) {
    throw new Error(
      `${name} must be a valid date no later than the 2026 year end`,
    );
  }
  return parsed.getTime();
}

/** IRS Schedule EIC line 6: compare days alive and retain actual calendar months. */
export function reviewedResidence2026(child: ResidenceFacts2026) {
  const birth = validDate2026(child.dob, "Dependent birth date");
  const start = Math.max(Date.UTC(2026, 0, 1), birth);
  const end = child.death_date === undefined
    ? Date.UTC(2026, 11, 31)
    : validDate2026(child.death_date, "Dependent death date");
  if (end < start) {
    throw new Error("Dependent must have been alive during 2026");
  }
  const availableMonths = new Date(end).getUTCMonth() -
    new Date(start).getUTCMonth() + 1;
  if (
    child.months_in_home > availableMonths ||
    (child.months_lived_with_you_in_us ?? 0) > child.months_in_home
  ) {
    throw new Error(
      "Dependent home months exceed the child's 2026 lifetime or U.S. months exceed home months",
    );
  }
  const shortLife = start > Date.UTC(2026, 0, 1) ||
    end < Date.UTC(2026, 11, 31);
  if (child.residency_2026_review === undefined) return undefined;
  const review = residency2026Schema.parse(child.residency_2026_review);
  if (child.dob.startsWith("2026-") && !review.birth_record_reference) {
    throw new Error("2026 birth residency needs a birth record");
  }
  if (child.death_date && !review.death_record_reference) {
    throw new Error("2026 death residency needs a death record");
  }
  const periods = review.periods.map((period) => ({
    ...period,
    start: validDate2026(period.from, "Residence start"),
    end: validDate2026(period.through, "Residence end"),
  })).sort((a, b) => a.start - b.start);
  let lastEnd = start - day;
  let days = 0;
  let usDays = 0;
  const months = new Set<number>();
  const usMonths = new Set<number>();
  for (const period of periods) {
    if (
      period.start < start || period.end > end || period.end < period.start ||
      period.start <= lastEnd
    ) {
      throw new Error(
        "Residence periods must be nonoverlapping and inside the child's 2026 lifetime",
      );
    }
    const duration = (period.end - period.start) / day + 1;
    days += duration;
    if (period.in_us) usDays += duration;
    for (let at = period.start; at <= period.end; at += day) {
      const month = new Date(at).getUTCMonth();
      months.add(month);
      if (period.in_us) usMonths.add(month);
    }
    lastEnd = period.end;
  }
  const lifeDays = (end - start) / day + 1;
  const overHalfWithFiler = days * 2 > lifeDays;
  const overHalfInUs = usDays * 2 > lifeDays;
  if (
    child.months_in_home !== months.size ||
    child.months_lived_with_you_in_us !== usMonths.size ||
    (child.lived_in_us_over_half_year !== undefined &&
      child.lived_in_us_over_half_year !== overHalfInUs)
  ) {
    throw new Error(
      "Residence periods disagree with the dependent's reported months or U.S. residency answer",
    );
  }
  return {
    days,
    usDays,
    lifeDays,
    overHalfWithFiler,
    overHalfInUs,
    allLifeWithFiler: days === lifeDays,
    eicPrintedMonths: overHalfInUs
      ? (shortLife || child.death_date !== undefined ||
          child.dob.startsWith("2026-")
        ? 12
        : Math.max(7, usMonths.size))
      : usMonths.size,
  };
}
