import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { resolveHousingLimit2025 } from "./housing_limits_2025.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const foreignAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  province_or_state: z.string().optional(),
  country_code: z.string().length(2),
  postal_code: z.string().optional(),
}).strict();

const housingExpenseSchema = z.object({
  kind: z.enum([
    "rent",
    "utilities_excluding_telephone",
    "property_insurance",
    "nonrefundable_lease_fee",
    "furniture_rental",
    "residential_parking",
    "household_repairs",
  ]),
  amount: z.number().int().positive(),
  incurred_date: dateSchema,
  housing_period_begin: dateSchema,
  housing_period_end: dateSchema,
  source_document_reference: z.string().trim().min(1),
  paid_by_taxpayer_from_reported_wages: z.literal(true),
  reasonable_expense_verified: z.literal(true),
}).strict();

const employeeHousingSchema = z.object({
  city: z.string().trim().min(1),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  limit_selection: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("notice_table"),
      location: z.string().trim().min(1),
      location_match_verified: z.literal(true),
      review_document_reference: z.string().trim().min(1),
    }).strict(),
    z.object({
      kind: z.literal("standard_unlisted"),
      verified_not_listed: z.literal(true),
      notice_review_document_reference: z.string().trim().min(1),
    }).strict(),
  ]),
  no_second_household: z.literal(true),
  no_other_housing_claimant: z.literal(true),
  no_section119_lodging_excluded: z.literal(true),
  no_nontaxable_us_government_housing_allowance: z.literal(true),
  expenses: z.array(housingExpenseSchema).min(1),
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
  claiming_housing_exclusion_or_deduction: z.boolean(),
  employee_housing: employeeHousingSchema.optional(),
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
  readonly line28: number;
  readonly line29a?: string;
  readonly line29b: number;
  readonly line30: number;
  readonly line31: number;
  readonly line32: number;
  readonly line33: number;
  readonly line34: number;
  readonly line35: number;
  readonly line36: number;
  readonly line38: number;
  readonly line39: number;
  readonly line40: number;
  readonly line41: number;
  readonly line42: number;
  readonly line43: number;
  readonly line44: 0;
  readonly line45: number;
  readonly line50: 0;
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
  const claimingHousing = filing.claiming_housing_exclusion_or_deduction;
  if (claimingHousing !== (filing.employee_housing !== undefined)) {
    throw new Error(
      "Form 2555 housing claim requires structured employee housing facts",
    );
  }
  const housing = filing.employee_housing;
  let line28 = 0;
  let line29a: string | undefined;
  let line29b = 0;
  let line30 = 0;
  let line31 = 0;
  let line32 = 0;
  let line33 = 0;
  let line34 = 0;
  let line35 = 0;
  let line36 = 0;
  if (housing) {
    if (
      housing.country_code !== filing.foreign_address.country_code ||
      housing.city.trim().toLowerCase() !==
        filing.foreign_address.city.trim().toLowerCase()
    ) {
      throw new Error(
        "Form 2555 employee housing location must match the single foreign residence",
      );
    }
    for (const expense of housing.expenses) {
      const incurred = utcDay(expense.incurred_date);
      const housingBegin = utcDay(expense.housing_period_begin);
      const housingEnd = utcDay(expense.housing_period_end);
      if (
        incurred < yearBegin || incurred > yearEnd ||
        housingBegin < overlapBegin || housingEnd > overlapEnd ||
        housingBegin > housingEnd
      ) {
        throw new Error(
          "Form 2555 housing expense must be incurred in TY2025 for housing entirely within qualifying days",
        );
      }
      line28 += expense.amount;
    }
    line31 = qualifyingDays;
    const housingLimit = resolveHousingLimit2025(
      housing.country_code,
      housing.city,
      housing.limit_selection,
      qualifyingDays,
    );
    line29a = housingLimit.line29a;
    line29b = housingLimit.line29b;
    line30 = Math.min(line28, line29b);
    line32 = qualifyingDays === 365
      ? 20_800
      : Math.round(56.99 * qualifyingDays);
    line33 = Math.max(0, line30 - line32);
    if (line33 > 0) {
      // This narrow filing has one foreign employer and wages as its only
      // foreign earned income; the wages are employer-provided amounts.
      line34 = line26;
      line35 = Math.min(1, Math.round(line34 / line26 * 100_000) / 100_000);
      line36 = Math.min(line34, Math.round(line33 * line35));
    }
  }
  const line38 = qualifyingDays;
  const line41 = line26 - line36;
  const line42 = Math.min(line40, line41);
  const line43 = line36 + line42;
  const line44 = 0;
  const line45 = line43;
  // Part IX applies only when line 33 exceeds line 36 and line 27 exceeds
  // line 43. This strict employee-only source allocates the entire housing
  // amount to employer wages, so line 36 equals line 33 and no housing
  // deduction can be entered on line 50.
  if (line33 > line36) {
    throw new Error(
      "Form 2555 employee-only source cannot support a Part IX housing deduction",
    );
  }
  const line50 = 0 as const;
  return {
    qualifyingDays,
    line19,
    line24,
    line25,
    line26,
    line28,
    line29a,
    line29b,
    line30,
    line31,
    line32,
    line33,
    line34,
    line35,
    line36,
    line38,
    line39,
    line40,
    line41,
    line42,
    line43,
    line44,
    line45,
    line50,
  };
}
