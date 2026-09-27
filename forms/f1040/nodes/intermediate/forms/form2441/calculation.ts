import { z } from "zod";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { form2441CreditRate, form2441Rules } from "./year-rules.ts";

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

const earnedIncomeMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  taxpayer_actual_earned_income: money,
  spouse_actual_earned_income: money.optional(),
  taxpayer_full_time_student: z.boolean().optional(),
  taxpayer_unable_to_care_for_self: z.boolean().optional(),
  spouse_full_time_student: z.boolean().optional(),
  spouse_unable_to_care_for_self: z.boolean().optional(),
  deemed_income_recipient: z.enum(["taxpayer", "spouse"]).optional(),
}).strict();

export const benefitDetailsSchema = z.object({
  filing_status: filingStatusSchema,
  care_providers: z.array(careProviderSchema).min(1).max(25),
  qualifying_people: z.array(qualifyingPersonSchema).min(1).max(25),
  taxpayer_earned_income: money,
  spouse_earned_income: money.optional(),
  earned_income_months: z.array(earnedIncomeMonthSchema).length(12).optional(),
  student_or_disabled_deemed_income_used: z.boolean().optional(),
  mfs_eligibility_met: z.boolean().optional(),
  mfs_line19_income: money.optional(),
  benefits_carryover_used: money.optional(),
  benefits_forfeited_or_carried_forward: money.optional(),
  dependent_care_plan_limit: money.optional(),
  // Total qualifying expenses incurred during the return year, Form 2441 line 16.
  total_qualified_expenses_incurred: money.optional(),
}).strict();

export const filingDetailsSchema = benefitDetailsSchema.extend({
  // Result of the Form 2441 Credit Limit Worksheet, not total tax.
  tax_liability_limit: money,
}).strict();

export type Form2441FilingDetails = z.infer<typeof filingDetailsSchema>;
export type Form2441BenefitDetails = z.infer<typeof benefitDetailsSchema>;

export interface Form2441Lines {
  readonly deemed_income_used: boolean;
  readonly line3: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9a: number;
  readonly line9b: number;
  readonly line9c: number;
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
  readonly line22: number;
  readonly line23: number;
  readonly line24: number;
  readonly line25: number;
  readonly line26: number;
  readonly line27: number;
  readonly line28: number;
  readonly line29: number;
  readonly line30: number;
  readonly line31: number;
}

export type Form2441BenefitLines = Pick<
  Form2441Lines,
  | "deemed_income_used"
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
  | "line22"
  | "line23"
  | "line24"
  | "line25"
  | "line26"
  | "line27"
  | "line28"
  | "line29"
  | "line30"
  | "line31"
>;

function earnedIncomeForCare(details: Form2441BenefitDetails): {
  taxpayer: number;
  spouse: number | undefined;
  deemedIncomeUsed: boolean;
} {
  const months = details.earned_income_months;
  if (!months) {
    if (details.student_or_disabled_deemed_income_used === true) {
      throw new Error("Form 2441 deemed income needs monthly facts");
    }
    return {
      taxpayer: details.taxpayer_earned_income,
      spouse: details.spouse_earned_income,
      deemedIncomeUsed: false,
    };
  }
  if (new Set(months.map(({ month }) => month)).size !== 12) {
    throw new Error("Form 2441 earned income needs each month exactly once");
  }
  const joint = details.filing_status === FilingStatus.MFJ;
  if (
    !joint &&
    months.some((month) =>
      month.spouse_actual_earned_income !== undefined ||
      month.spouse_full_time_student !== undefined ||
      month.spouse_unable_to_care_for_self !== undefined ||
      month.deemed_income_recipient === "spouse"
    )
  ) {
    throw new Error("Form 2441 spouse monthly facts require a joint return");
  }
  if (
    joint &&
    months.some((month) => month.spouse_actual_earned_income === undefined)
  ) {
    throw new Error(
      "Form 2441 joint return needs spouse income for each month",
    );
  }
  const actualTaxpayer = months.reduce(
    (sum, month) => sum + month.taxpayer_actual_earned_income,
    0,
  );
  const actualSpouse = months.reduce(
    (sum, month) => sum + (month.spouse_actual_earned_income ?? 0),
    0,
  );
  if (
    actualTaxpayer !== details.taxpayer_earned_income ||
    (joint && actualSpouse !== details.spouse_earned_income)
  ) {
    throw new Error(
      "Form 2441 monthly actual income disagrees with annual income",
    );
  }
  const taxpayerStudent =
    months.filter((month) => month.taxpayer_full_time_student === true)
      .length >= 5;
  const spouseStudent =
    months.filter((month) => month.spouse_full_time_student === true).length >=
      5;
  const floor = details.qualifying_people.length > 1 ? 500 : 250;
  let taxpayer = 0;
  let spouse = 0;
  let deemedIncomeUsed = false;
  for (const month of months) {
    const taxpayerEligible =
      (taxpayerStudent && month.taxpayer_full_time_student === true) ||
      month.taxpayer_unable_to_care_for_self === true;
    const spouseEligible = joint &&
      ((spouseStudent && month.spouse_full_time_student === true) ||
        month.spouse_unable_to_care_for_self === true);
    const taxpayerIncrease = taxpayerEligible &&
      month.taxpayer_actual_earned_income < floor;
    const spouseIncrease = spouseEligible &&
      month.spouse_actual_earned_income! < floor;
    const recipient = month.deemed_income_recipient;
    if (taxpayerIncrease && spouseIncrease && !recipient) {
      throw new Error(
        `Form 2441 month ${month.month} needs one deemed income recipient`,
      );
    }
    if (
      recipient &&
      (recipient === "taxpayer" ? !taxpayerIncrease : !spouseIncrease)
    ) {
      throw new Error(
        `Form 2441 month ${month.month} has an ineligible deemed income recipient`,
      );
    }
    const useTaxpayer = taxpayerIncrease &&
      (!spouseIncrease || recipient === "taxpayer");
    const useSpouse = spouseIncrease &&
      (!taxpayerIncrease || recipient === "spouse");
    taxpayer += useTaxpayer ? floor : month.taxpayer_actual_earned_income;
    spouse += useSpouse ? floor : month.spouse_actual_earned_income ?? 0;
    deemedIncomeUsed ||= useTaxpayer || useSpouse;
  }
  if (
    details.student_or_disabled_deemed_income_used !== undefined &&
    details.student_or_disabled_deemed_income_used !== deemedIncomeUsed
  ) {
    throw new Error(
      "Form 2441 deemed income answer disagrees with monthly facts",
    );
  }
  return { taxpayer, spouse: joint ? spouse : undefined, deemedIncomeUsed };
}

/** Part III is AGI-independent and must run before the AGI aggregator. */
export function calculateForm2441Benefits(
  rawDetails: Form2441BenefitDetails,
  benefits: number,
  taxYear: number,
): Form2441BenefitLines {
  const rules = form2441Rules(taxYear);
  const details = benefitDetailsSchema.parse(rawDetails);
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
  const earnedIncome = earnedIncomeForCare(details);
  const line30 = details.qualifying_people.reduce(
    (sum, person) => sum + person.credit_expenses_paid,
    0,
  );
  const line27 = details.qualifying_people.length > 1
    ? rules.expenseCapTwoPlus
    : rules.expenseCapOne;
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
  const line18 = earnedIncome.taxpayer;
  const line19 = details.filing_status === FilingStatus.MFJ
    ? earnedIncome.spouse!
    : details.filing_status === FilingStatus.MFS &&
        !details.mfs_eligibility_met
    ? details.mfs_line19_income!
    : line18;
  const line20 = Math.min(line17, line18, line19);
  // Draft Form 2441 line 21 halves the limit for MFS only when spouse
  // earned income was required on line 19. A qualifying separate filer
  // treated as unmarried uses their own income and the full limit.
  const statutoryLimit = details.filing_status === FilingStatus.MFS &&
      !details.mfs_eligibility_met
    ? rules.employerExclusionMfs
    : rules.employerExclusion;
  if (line15 > 0 && details.dependent_care_plan_limit === undefined) {
    throw new Error("Form 2441 benefits need the dependent-care plan limit");
  }
  const line21 = Math.min(
    statutoryLimit,
    details.dependent_care_plan_limit ?? statutoryLimit,
  );
  // The structured route currently accepts W-2 employee benefits only.
  // Sole-proprietor and partnership benefits need separate line 22/24 facts.
  const line22 = 0;
  const line23 = line15;
  const line24 = 0;
  const line25 = Math.min(line20, line21);
  const line26 = Math.max(0, line23 - line25);
  const line28 = line24 + line25;
  const line29 = Math.max(0, line27 - line28);
  if (line30 + line28 > line16) {
    throw new Error(
      "Form 2441 credit expenses plus excluded benefits exceed qualified expenses",
    );
  }
  const line31 = Math.min(line29, line30);
  return {
    deemed_income_used: earnedIncome.deemedIncomeUsed,
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
    line22,
    line23,
    line24,
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
  taxYear: number,
): Form2441Lines {
  const details = filingDetailsSchema.parse(rawDetails);
  if (!Number.isFinite(agi)) {
    throw new Error("Form 2441 needs calculated AGI");
  }
  const { tax_liability_limit, ...benefitDetails } = details;
  const benefitLines = calculateForm2441Benefits(
    benefitDetails,
    benefits,
    taxYear,
  );
  const line3 = benefitLines.line15 > 0
    ? benefitLines.line31
    : Math.min(benefitLines.line30, benefitLines.line27);
  const line4 = benefitLines.line18;
  const line5 = details.filing_status === FilingStatus.MFJ
    ? benefitLines.line19
    : benefitLines.line18;
  const line6 = Math.min(line3, line4, line5);
  const line7 = agi;
  const line8 = form2441CreditRate(taxYear, agi, details.filing_status);
  const line9a = Math.round(line6 * line8);
  // Prior-year care expenses paid this year need Worksheet A source facts.
  const line9b = 0;
  const line9c = line9a + line9b;
  const line10 = tax_liability_limit;
  const line11 = details.filing_status === FilingStatus.MFS &&
      !details.mfs_eligibility_met
    ? 0
    : Math.min(line9c, line10);
  return {
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9a,
    line9b,
    line9c,
    line10,
    line11,
    ...benefitLines,
  };
}
