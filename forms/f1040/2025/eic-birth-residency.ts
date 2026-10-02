import { z } from "zod";

const fullLifeBirthReviewSchema = z.object({
  birth_record_reference: z.string().trim().min(1),
  us_home_residence_record_reference: z.string().trim().min(1),
  lived_with_filer_in_us_from_birth_through_2025_verified: z.literal(true),
  alive_on_2025_12_31_verified: z.literal(true),
}).strict();

const partialLifeBirthReviewSchema = z.object({
  birth_record_reference: z.string().trim().min(1),
  us_home_residence_record_reference: z.string().trim().min(1),
  us_home_residence_start_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  us_home_residence_end_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  alive_on_2025_12_31_verified: z.literal(true),
}).strict();

export const eicBirthResidencyReviewSchema = z.union([
  fullLifeBirthReviewSchema,
  partialLifeBirthReviewSchema,
]);

export interface EicBirthResidencyFacts {
  readonly dob: string;
  readonly months_in_home: number;
  readonly months_lived_with_you_in_us?: number;
  readonly eic_birth_residency_review?: unknown;
}

/** A reviewed full-life birth route is narrower than the IRS half-life rule. */
export function reviewedEicBirthResidence(
  child: EicBirthResidencyFacts,
): boolean {
  if (child.eic_birth_residency_review === undefined) return false;
  const review = eicBirthResidencyReviewSchema.parse(
    child.eic_birth_residency_review,
  );
  const match = /^(2025)-(\d{2})-(\d{2})$/.exec(child.dob);
  if (!match) {
    throw new Error("EIC birth residency review needs a 2025 birth date");
  }
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(2025, month - 1, day));
  if (
    date.getUTCFullYear() !== 2025 || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("EIC birth residency review needs a valid birth date");
  }
  const calendarMonths = 13 - month;
  if ("us_home_residence_start_date" in review) {
    const parseResidenceDate = (value: string): Date => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
      ) {
        throw new Error(
          "EIC birth residency review needs valid U.S. home dates",
        );
      }
      return parsed;
    };
    const start = parseResidenceDate(review.us_home_residence_start_date);
    const end = parseResidenceDate(review.us_home_residence_end_date);
    const yearEnd = Date.UTC(2025, 11, 31);
    const birthTime = date.getTime();
    const residenceDays = (end.getTime() - start.getTime()) / 86_400_000 + 1;
    const lifeDays = (yearEnd - birthTime) / 86_400_000 + 1;
    const residenceMonths =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() - start.getUTCMonth() + 1;
    if (
      start.getTime() < birthTime || end.getTime() > yearEnd ||
      (start.getTime() === birthTime && end.getTime() === yearEnd) ||
      residenceDays * 2 <= lifeDays ||
      child.months_in_home !== residenceMonths ||
      child.months_lived_with_you_in_us !== residenceMonths
    ) {
      throw new Error(
        "EIC birth residency review needs U.S. home for more than half of 2025 life",
      );
    }
    return true;
  }
  if (
    child.months_in_home !== calendarMonths ||
    child.months_lived_with_you_in_us !== calendarMonths
  ) {
    throw new Error(
      "EIC birth residency review needs U.S. home for every 2025 birth month",
    );
  }
  return true;
}

/** The published line 6 value differs from actual calendar months for births. */
export function scheduleEicLine6Months(child: EicBirthResidencyFacts): number {
  if (reviewedEicBirthResidence(child)) return 12;
  const actual = child.months_lived_with_you_in_us;
  const birth = /^(2025)-(\d{2})-(\d{2})$/.exec(child.dob);
  if (birth) {
    const month = Number(birth[2]);
    const day = Number(birth[3]);
    const date = new Date(Date.UTC(2025, month - 1, day));
    if (
      date.getUTCFullYear() !== 2025 || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      child.months_in_home > 13 - month ||
      (actual ?? 0) > 13 - month
    ) {
      throw new Error(
        "Schedule EIC 2025 birth months exceed possible calendar residence",
      );
    }
  }
  if (
    typeof actual !== "number" || !Number.isInteger(actual) || actual < 7 ||
    actual > 12 || actual > child.months_in_home
  ) {
    throw new Error("Schedule EIC needs seven through twelve U.S. months");
  }
  return actual;
}
