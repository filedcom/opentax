import { z } from "zod";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";

const money = z.number().int().nonnegative();

const usAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(?:-?\d{4})?$/),
}).strict();

const providerBase = {
  name_control: z.string().min(1).max(4),
  us_address: usAddressSchema,
  household_employee: z.boolean(),
  amount_paid: money,
};

export const careProviderSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("person"),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    ssn: z.string().regex(/^\d{9}$/),
    ...providerBase,
  }).strict(),
  z.object({
    kind: z.literal("business"),
    name: z.string().min(1),
    ein: z.string().regex(/^\d{9}$/),
    ...providerBase,
  }).strict(),
]);

export const qualifyingPersonSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  name_control: z.string().min(1).max(4),
  ssn: z.string().regex(/^\d{9}$/),
  over_12_and_disabled: z.boolean().optional(),
  // Form 2441 line 2(d), excluding amounts used for dependent-care benefits.
  credit_expenses_paid: money,
}).strict();

export const filingDetailsSchema = z.object({
  filing_status: filingStatusSchema,
  care_providers: z.array(careProviderSchema).min(1).max(25),
  qualifying_people: z.array(qualifyingPersonSchema).min(1).max(25),
  taxpayer_earned_income: money,
  spouse_earned_income: money.optional(),
  // This is the result of the Form 2441 Credit Limit Worksheet, not total tax.
  tax_liability_limit: money,
  student_or_disabled_deemed_income_used: z.boolean().optional(),
  mfs_eligibility_met: z.boolean().optional(),
  mfs_line19_income: money.optional(),
  benefits_carryover_used: money.optional(),
  benefits_forfeited_or_carried_forward: money.optional(),
  dependent_care_plan_limit: money.optional(),
  // Total qualifying expenses incurred during 2025, Form 2441 line 16.
  total_qualified_expenses_incurred: money.optional(),
}).strict();

export type Form2441FilingDetails = z.infer<typeof filingDetailsSchema>;

export interface Form2441Lines {
  readonly line3: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9a: number;
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line14: number;
  readonly line15: number;
  readonly line16: number;
  readonly line17: number;
  readonly line18: number;
  readonly line19: number;
  readonly line20: number;
  readonly line21: number;
  readonly line23: number;
  readonly line25: number;
  readonly line26: number;
  readonly line27: number;
  readonly line28: number;
  readonly line29: number;
  readonly line30: number;
  readonly line31: number;
}

function creditRate(agi: number): number {
  if (agi <= 15_000) return 0.35;
  return Math.max(0.20, (35 - Math.ceil((agi - 15_000) / 2_000)) / 100);
}

export type Form2441BenefitLines = Pick<
  Form2441Lines,
  | "line12"
  | "line13"
  | "line14"
  | "line15"
  | "line16"
  | "line17"
  | "line18"
  | "line19"
  | "line20"
  | "line21"
  | "line23"
  | "line25"
  | "line26"
  | "line27"
  | "line28"
  | "line29"
  | "line30"
  | "line31"
>;

/** Part III is AGI-independent and must run before the AGI aggregator. */
export function calculateForm2441Benefits(
  rawDetails: Form2441FilingDetails,
  benefits: number,
): Form2441BenefitLines {
  const details = filingDetailsSchema.parse(rawDetails);
  if (!Number.isInteger(benefits) || benefits < 0) {
    throw new Error("Form 2441 needs nonnegative whole-dollar benefits");
  }
  if (
    details.filing_status === FilingStatus.MFJ &&
    details.spouse_earned_income === undefined
  ) {
    throw new Error("Form 2441 joint return needs spouse earned income");
  }
  if (details.filing_status === FilingStatus.MFS) {
    if (details.mfs_eligibility_met === undefined) {
      throw new Error("Form 2441 separate return needs the eligibility answer");
    }
    if (
      !details.mfs_eligibility_met &&
      details.mfs_line19_income === undefined
    ) {
      throw new Error("Form 2441 separate return needs spouse line 19 income");
    }
  }
  const line30 = details.qualifying_people.reduce(
    (sum, person) => sum + person.credit_expenses_paid,
    0,
  );
  const line27 = details.qualifying_people.length > 1 ? 6_000 : 3_000;
  const line12 = benefits;
  const line13 = details.benefits_carryover_used ?? 0;
  const line14 = details.benefits_forfeited_or_carried_forward ?? 0;
  if (line14 > line12 + line13) {
    throw new Error("Form 2441 forfeited benefits exceed available benefits");
  }
  const line15 = line12 + line13 - line14;
  if (line15 > 0 && details.total_qualified_expenses_incurred === undefined) {
    throw new Error(
      "Form 2441 benefits need total qualifying expenses incurred",
    );
  }
  const line16 = details.total_qualified_expenses_incurred ?? line30;
  const line17 = Math.min(line15, line16);
  const line18 = details.taxpayer_earned_income;
  const line19 = details.filing_status === FilingStatus.MFJ
    ? details.spouse_earned_income!
    : details.filing_status === FilingStatus.MFS &&
        !details.mfs_eligibility_met
    ? details.mfs_line19_income!
    : line18;
  const line20 = Math.min(line17, line18, line19);
  const statutoryLimit = details.filing_status === FilingStatus.MFS
    ? 2_500
    : 5_000;
  if (line15 > 0 && details.dependent_care_plan_limit === undefined) {
    throw new Error("Form 2441 benefits need the dependent-care plan limit");
  }
  const line21 = Math.min(
    statutoryLimit,
    details.dependent_care_plan_limit ?? statutoryLimit,
  );
  const line23 = line15;
  const line25 = Math.min(line20, line21);
  const line26 = Math.max(0, line23 - line25);
  const line28 = line25;
  const line29 = Math.max(0, line27 - line28);
  if (line30 + line28 > line16) {
    throw new Error(
      "Form 2441 credit expenses plus excluded benefits exceed qualified expenses",
    );
  }
  const line31 = Math.min(line29, line30);
  return {
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line23,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30,
    line31,
  };
}

/** Complete Form 2441 after the AGI aggregator has finalized line 11. */
export function calculateForm2441(
  rawDetails: Form2441FilingDetails,
  agi: number,
  benefits: number,
): Form2441Lines {
  const details = filingDetailsSchema.parse(rawDetails);
  if (!Number.isInteger(agi)) {
    throw new Error("Form 2441 needs calculated whole-dollar AGI");
  }
  const benefitLines = calculateForm2441Benefits(details, benefits);
  const line3 = benefitLines.line15 > 0
    ? benefitLines.line31
    : Math.min(benefitLines.line30, benefitLines.line27);
  const line4 = benefitLines.line18;
  const line5 = details.filing_status === FilingStatus.MFJ
    ? benefitLines.line19
    : benefitLines.line18;
  const line6 = Math.min(line3, line4, line5);
  const line7 = agi;
  const line8 = creditRate(agi);
  const line9a = Math.round(line6 * line8);
  const line10 = details.tax_liability_limit;
  const line11 = details.filing_status === FilingStatus.MFS &&
      !details.mfs_eligibility_met
    ? 0
    : Math.min(line9a, line10);
  return {
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9a,
    line10,
    line11,
    ...benefitLines,
  };
}
