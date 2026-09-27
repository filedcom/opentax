import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const foreignAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  province_or_state: z.string().optional(),
  country_code: z.string().length(2),
  postal_code: z.string().optional(),
}).strict();

/** Facts for a foreign-employer wage claim with uninterrupted physical presence. */
export const physicalPresenceFilingSchema = z.object({
  foreign_address: foreignAddressSchema,
  occupation: z.string().min(1).max(35),
  employer_name: z.string().min(1),
  employer_foreign_address: foreignAddressSchema,
  employer_has_us_ein: z.literal(false),
  employer_issued_w2: z.literal(false),
  citizenship_country: z.string().min(1).max(35),
  tax_home_description: z.string().min(1).max(35),
  tax_home_established_date: dateSchema,
  tax_home_foreign_entire_period: z.literal(true),
  physical_presence_begin: dateSchema,
  physical_presence_end: dateSchema,
  principal_employment_country: z.string().min(1).max(35),
  no_travel_during_period: z.literal(true),
  employment_contract_terms: z.string().min(1).max(80),
  visa_type: z.string().min(1).max(30),
  visa_limits_stay: z.literal(false),
  maintained_us_home: z.literal(false),
  no_prior_exclusion_claim: z.literal(true),
  exclusion_previously_revoked: z.literal(false),
  separate_foreign_residence: z.literal(false),
  foreign_wages: z.number().int().positive(),
  no_other_foreign_earned_income: z.literal(true),
  claiming_housing_exclusion_or_deduction: z.literal(false),
  deductions_allocable_to_excluded_income: z.literal(0),
  // Distinct Form 6251 Foreign Earned Income Tax Worksheet line 2b total:
  // itemized deductions or exclusions not claimable because they relate to
  // excluded income. The Form 2555 deduction fact above does not establish
  // the total of this broader AMT worksheet line.
  amt_line2b_disallowed_deductions_and_exclusions: z.number().nonnegative()
    .optional(),
}).strict();

export type PhysicalPresenceFiling = z.infer<
  typeof physicalPresenceFilingSchema
>;

export interface PhysicalPresenceLines {
  readonly qualifyingDays: number;
  readonly line19: number;
  readonly line24: number;
  readonly line25: 0;
  readonly line26: number;
  readonly line38: number;
  readonly line39: number;
  readonly line40: number;
  readonly line41: number;
  readonly line42: number;
  readonly line43: number;
  readonly line44: 0;
  readonly line45: number;
}

function utcDay(raw: string): number {
  const value = Date.parse(`${raw}T00:00:00Z`);
  if (
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 10) !== raw
  ) {
    throw new Error(`Form 2555 invalid date: ${raw}`);
  }
  return value;
}

export function calculatePhysicalPresence2555(
  raw: PhysicalPresenceFiling,
  taxYear: number,
): PhysicalPresenceLines {
  const filing = physicalPresenceFilingSchema.parse(raw);
  if (taxYear !== 2025) {
    throw new Error("Form 2555 structured filing is available for TY2025 only");
  }
  const begin = utcDay(filing.physical_presence_begin);
  const end = utcDay(filing.physical_presence_end);
  const expectedEnd = new Date(begin);
  expectedEnd.setUTCFullYear(expectedEnd.getUTCFullYear() + 1);
  expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
  if (end !== expectedEnd.getTime()) {
    throw new Error("Form 2555 physical-presence period must be 12 months");
  }
  if (utcDay(filing.tax_home_established_date) > begin) {
    throw new Error(
      "Form 2555 foreign tax home must predate the presence period",
    );
  }
  const yearBegin = Date.UTC(taxYear, 0, 1);
  const yearEnd = Date.UTC(taxYear, 11, 31);
  const overlapBegin = Math.max(begin, yearBegin);
  const overlapEnd = Math.min(end, yearEnd);
  const qualifyingDays = overlapEnd >= overlapBegin
    ? (overlapEnd - overlapBegin) / 86_400_000 + 1
    : 0;
  if (qualifyingDays === 0) {
    throw new Error("Form 2555 qualifying period does not overlap TY2025");
  }
  const line39 = Math.round(qualifyingDays / 365 * 100_000) / 100_000;
  const line40 = Math.round(CONFIG_BY_YEAR[2025].feieLimit * line39);
  const line19 = filing.foreign_wages;
  const line24 = line19;
  const line25 = 0;
  const line26 = line24;
  const line38 = qualifyingDays;
  const line41 = line26;
  const line42 = Math.min(line40, line41);
  const line43 = line42;
  const line44 = 0;
  const line45 = line43;
  return {
    qualifyingDays,
    line19,
    line24,
    line25,
    line26,
    line38,
    line39,
    line40,
    line41,
    line42,
    line43,
    line44,
    line45,
  };
}
