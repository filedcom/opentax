import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

const vehiclePurchaseDateSchema = z.string().regex(/^2025-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value;
  }, "Must be a valid 2025 calendar date");

const vehicleLoanSchema = z.object({
  vin: z.string().trim().regex(
    /^[A-HJ-NPR-Z0-9]{17}$/i,
    "VIN must contain 17 characters and cannot contain I, O, or Q",
  ),
  borrower_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  loan_originated_date: vehiclePurchaseDateSchema,
  vehicle_purchased_date: vehiclePurchaseDateSchema,
  lender_name: z.string().trim().min(1),
  lender_interest_statement_reference: z.string().trim().min(1),
  purchase_and_lien_reference: z.string().trim().min(1),
  final_assembly_reference: z.string().trim().min(1),
  original_borrower: z.literal(true),
  purchase_proceeds_only: z.literal(true),
  first_lien_secured: z.literal(true),
  original_vehicle_use: z.literal(true),
  road_vehicle_with_two_or_more_wheels: z.literal(true),
  vehicle_type: z.enum([
    "car",
    "minivan",
    "van",
    "suv",
    "pickup",
    "motorcycle",
  ]),
  gross_vehicle_weight_under_14000_pounds: z.literal(true),
  final_assembly_in_us: z.literal(true),
  expected_personal_use_over_half: z.literal(true),
  qualified_interest_paid: z.number().int().positive(),
  interest_deducted_elsewhere: z.literal(0),
  no_other_interest_deduction_review_reference: z.string().trim().min(1),
}).strict();

/** Fields a taxpayer supplies directly for Schedule 1-A. */
export const seniorZeroExclusionsReviewSchema = z.object({
  no_section933_puerto_rico_excluded_income: z.literal(true),
  section933_review_source_reference: z.string().trim().min(1),
  no_form2555_filed: z.literal(true),
  form2555_review_source_reference: z.string().trim().min(1),
  no_form4563_filed: z.literal(true),
  form4563_review_source_reference: z.string().trim().min(1),
}).strict();

export const claimInputSchema = z.object({
  vehicle_loans: z.array(vehicleLoanSchema).min(1).max(2).optional(),
  senior_zero_exclusions_review: seniorZeroExclusionsReviewSchema.optional(),
}).strict();

export const inputSchema = claimInputSchema.extend({
  qualified_w2_overtime: z.array(
    z.object({
      employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
      employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
      amount: z.number().nonnegative(),
      box1_wages: z.number().nonnegative(),
      covered_nonexempt_employee: z.literal(true),
      premium_included_in_box1: z.literal(true),
      source_reference: z.string().trim().min(1),
    }).strict(),
  ).optional(),
  qualified_employee_tips: z.array(z.object({
    employee_ssn: z.string(),
    amount: z.number().nonnegative(),
    box5_medicare_wages: z.number().nonnegative().optional(),
    occupation_code: z.string().regex(/^\d{3}$/).optional(),
  })).optional(),
  magi: z.number().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  taxpayer_has_valid_ssn: z.boolean().optional(),
  spouse_has_valid_ssn: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
});

type Schedule1AInput = z.infer<typeof inputSchema>;

export const seniorOnlyLinesSchema = z.object({
  line1_agi: z.number().int(),
  line3_magi: z.number().int(),
  line32_threshold: z.number().int().positive(),
  line33_excess_magi: z.number().int().nonnegative(),
  line34_reduction: z.number().int().nonnegative(),
  line35_per_person: z.number().int().nonnegative(),
  line36a_taxpayer: z.number().int().nonnegative(),
  line36b_spouse: z.number().int().nonnegative(),
  line37_senior: z.number().int().positive(),
  line38_total: z.number().int().positive(),
}).strict();

export type SeniorOnlyLines = z.infer<typeof seniorOnlyLinesSchema>;

export const singleEmployerTipsLinesSchema = z.object({
  line1_agi: z.number().int(),
  line3_magi: z.number().int(),
  line4a_w2_tips: z.number().int().positive(),
  line4c_employee_tips: z.number().int().positive(),
  line6_total_tips: z.number().int().positive(),
  line7_capped_tips: z.number().int().positive(),
  line9_threshold: z.number().int().positive(),
  line10_excess_magi: z.number().int().nonnegative(),
  line11_thousands: z.number().int().nonnegative(),
  line12_reduction: z.number().int().nonnegative(),
  line13_tips: z.number().int().positive(),
  line38_total: z.number().int().positive(),
}).strict();

export type SingleEmployerTipsLines = z.infer<
  typeof singleEmployerTipsLinesSchema
>;

export const w2OvertimeLinesSchema = z.object({
  line1_agi: z.number().int(),
  line3_magi: z.number().int(),
  line14a_w2_overtime: z.number().int().positive(),
  line14c_total_overtime: z.number().int().positive(),
  line15_capped_overtime: z.number().int().positive(),
  line17_threshold: z.number().int().positive(),
  line18_excess_magi: z.number().int().nonnegative(),
  line19_thousands: z.number().int().nonnegative(),
  line20_reduction: z.number().int().nonnegative(),
  line21_overtime: z.number().int().positive(),
  line38_total: z.number().int().positive(),
}).strict();

export type W2OvertimeLines = z.infer<typeof w2OvertimeLinesSchema>;

export const vehicleInterestLinesSchema = z.object({
  line1_agi: z.number().int(),
  line3_magi: z.number().int(),
  line22_vehicles: z.array(
    z.object({
      vin: z.string(),
      deducted_elsewhere: z.literal(0),
      schedule1a_interest: z.number().int().positive(),
    }).strict(),
  ).min(1).max(2),
  line23_total_interest: z.number().int().positive(),
  line24_capped_interest: z.number().int().positive(),
  line26_threshold: z.number().int().positive(),
  line27_excess_magi: z.number().int().nonnegative(),
  line28_thousands: z.number().int().nonnegative(),
  line29_reduction: z.number().int().nonnegative(),
  line30_vehicle_interest: z.number().int().positive(),
  line38_total: z.number().int().positive(),
}).strict();

export type VehicleInterestLines = z.infer<typeof vehicleInterestLinesSchema>;

const QUALIFIED_TIPS_CAP = 25_000;
const OVERTIME_CAP = 12_500;
const OVERTIME_CAP_MFJ = 25_000;
const TIPS_OVERTIME_PHASEOUT_THRESHOLD = 150_000;
const TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ = 300_000;
const VEHICLE_INTEREST_CAP = 10_000;
const VEHICLE_PHASEOUT_THRESHOLD = 100_000;
const VEHICLE_PHASEOUT_THRESHOLD_MFJ = 200_000;

// IRS.gov/TippedOccupations, TY2025 list (the published codes are contiguous
// within each of these occupation groups).
const QUALIFIED_TIP_OCCUPATION_RANGES: readonly [number, number][] = [
  [101, 110],
  [201, 211],
  [301, 304],
  [401, 409],
  [501, 510],
  [601, 611],
  [701, 706],
  [801, 810],
];

export function isQualifiedTipsOccupationCode(code: string): boolean {
  if (!/^\d{3}$/.test(code)) return false;
  const number = Number(code);
  return QUALIFIED_TIP_OCCUPATION_RANGES.some(([first, last]) =>
    number >= first && number <= last
  );
}

function tipsOvertimePhaseout(input: Schedule1AInput): number | undefined {
  if (input.filing_status === undefined || input.magi === undefined) {
    return undefined;
  }
  const threshold = input.filing_status === FilingStatus.MFJ
    ? TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ
    : TIPS_OVERTIME_PHASEOUT_THRESHOLD;
  return Math.floor(Math.max(0, input.magi - threshold) / 1_000) * 100;
}

export function qualifiedTipsDeduction(input: Schedule1AInput): number {
  const taxpayerSsn = input.taxpayer_ssn?.replaceAll("-", "");
  const spouseSsn = input.spouse_ssn?.replaceAll("-", "");
  const eligibleTips = (input.qualified_employee_tips ?? []).reduce(
    (sum, entry) => {
      const employeeSsn = entry.employee_ssn.replaceAll("-", "");
      if (
        employeeSsn === taxpayerSsn &&
        input.taxpayer_has_valid_ssn === true
      ) return sum + entry.amount;
      if (
        input.filing_status === FilingStatus.MFJ &&
        employeeSsn === spouseSsn &&
        input.spouse_has_valid_ssn === true
      ) return sum + entry.amount;
      return sum;
    },
    0,
  );
  const tips = Math.min(eligibleTips, QUALIFIED_TIPS_CAP);
  const phaseout = tipsOvertimePhaseout(input);
  if (
    tips === 0 ||
    input.filing_status === FilingStatus.MFS ||
    phaseout === undefined
  ) {
    return 0;
  }
  return Math.max(0, tips - phaseout);
}

export function qualifiedOvertimeDeduction(input: Schedule1AInput): number {
  if (
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS
  ) {
    return 0;
  }

  const taxpayerSsn = input.taxpayer_ssn?.replaceAll("-", "");
  const spouseSsn = input.spouse_ssn?.replaceAll("-", "");
  const eligibleOvertime = (input.qualified_w2_overtime ?? []).reduce(
    (sum, entry) => {
      const employeeSsn = entry.employee_ssn.replaceAll("-", "");
      if (
        employeeSsn === taxpayerSsn &&
        input.taxpayer_has_valid_ssn === true
      ) return sum + entry.amount;
      if (
        input.filing_status === FilingStatus.MFJ &&
        employeeSsn === spouseSsn &&
        input.spouse_has_valid_ssn === true
      ) return sum + entry.amount;
      return sum;
    },
    0,
  );
  const cap = input.filing_status === FilingStatus.MFJ
    ? OVERTIME_CAP_MFJ
    : OVERTIME_CAP;
  const phaseout = tipsOvertimePhaseout(input);
  if (phaseout === undefined) return 0;
  return Math.max(
    0,
    Math.min(eligibleOvertime, cap) - phaseout,
  );
}

export function vehicleLoanInterestDeduction(input: Schedule1AInput): number {
  if (input.filing_status === undefined || input.magi === undefined) return 0;
  const qualifiedInterest = (input.vehicle_loans ?? []).reduce(
    (sum, loan) => {
      const borrower = loan.borrower_ssn.replaceAll("-", "");
      const taxpayer = borrower === input.taxpayer_ssn?.replaceAll("-", "");
      const spouse = input.filing_status === FilingStatus.MFJ &&
        borrower === input.spouse_ssn?.replaceAll("-", "");
      return sum + (taxpayer || spouse ? loan.qualified_interest_paid : 0);
    },
    0,
  );
  if (qualifiedInterest <= 0) return 0;

  const threshold = input.filing_status === FilingStatus.MFJ
    ? VEHICLE_PHASEOUT_THRESHOLD_MFJ
    : VEHICLE_PHASEOUT_THRESHOLD;
  const phaseout = Math.ceil(Math.max(0, input.magi - threshold) / 1_000) * 200;
  return Math.max(
    0,
    Math.min(qualifiedInterest, VEHICLE_INTEREST_CAP) - phaseout,
  );
}

export function seniorDeduction(
  ctx: NodeContext,
  input: Schedule1AInput,
): number {
  if (
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS ||
    input.magi === undefined
  ) {
    return 0;
  }
  const cfg = CONFIG_BY_YEAR[ctx.taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

  const taxpayerEligible = input.taxpayer_age_65_or_older === true &&
    input.taxpayer_has_valid_ssn === true;
  const spouseEligible = input.filing_status === FilingStatus.MFJ &&
    input.spouse_age_65_or_older === true &&
    input.spouse_has_valid_ssn === true;
  const eligiblePeople = Number(taxpayerEligible) + Number(spouseEligible);
  if (eligiblePeople === 0) return 0;

  const threshold = input.filing_status === FilingStatus.MFJ
    ? cfg.seniorDeductionPhaseoutMfj
    : cfg.seniorDeductionPhaseoutSingle;
  const perPerson = Math.max(
    0,
    cfg.seniorDeductionMax -
      Math.round(
        Math.max(0, input.magi - threshold) *
          cfg.seniorDeductionPhaseoutRate,
      ),
  );
  return eligiblePeople * perPerson;
}

/** The strictly zero-exclusion, senior-only TY2025 filing subset. */
export function calculateSeniorOnlySchedule1A(
  ctx: NodeContext,
  rawInput: Schedule1AInput,
): SeniorOnlyLines {
  if (ctx.taxYear !== 2025) {
    throw new Error("Schedule 1-A senior-only filing needs tax year 2025");
  }
  const input = inputSchema.parse(rawInput);
  if (!input.senior_zero_exclusions_review) {
    throw new Error(
      "Schedule 1-A senior filing needs sourced zero-exclusion review for Part I",
    );
  }
  if (
    (input.qualified_employee_tips?.length ?? 0) > 0 ||
    (input.qualified_w2_overtime?.length ?? 0) > 0 ||
    (input.vehicle_loans?.length ?? 0) > 0
  ) {
    throw new Error(
      "Schedule 1-A senior-only filing cannot include tips, overtime, or vehicle interest",
    );
  }
  if (
    input.magi === undefined || !Number.isSafeInteger(input.magi) ||
    input.filing_status === undefined
  ) {
    throw new Error(
      "Schedule 1-A senior filing needs whole-dollar Form 1040 AGI and filing status",
    );
  }
  const cfg = CONFIG_BY_YEAR[2025];
  const threshold = input.filing_status === FilingStatus.MFJ
    ? cfg.seniorDeductionPhaseoutMfj
    : cfg.seniorDeductionPhaseoutSingle;
  const excess = Math.max(0, input.magi - threshold);
  const reduction = Math.round(excess * cfg.seniorDeductionPhaseoutRate);
  const perPerson = Math.max(0, cfg.seniorDeductionMax - reduction);
  const taxpayer = input.taxpayer_age_65_or_older === true &&
      input.taxpayer_has_valid_ssn === true
    ? perPerson
    : 0;
  const spouse = input.filing_status === FilingStatus.MFJ &&
      input.spouse_age_65_or_older === true &&
      input.spouse_has_valid_ssn === true
    ? perPerson
    : 0;
  if (input.filing_status === FilingStatus.MFS || taxpayer + spouse <= 0) {
    throw new Error(
      "Schedule 1-A senior filing needs an eligible senior with a valid SSN and joint filing when married",
    );
  }
  return seniorOnlyLinesSchema.parse({
    line1_agi: input.magi,
    line3_magi: input.magi,
    line32_threshold: threshold,
    line33_excess_magi: excess,
    line34_reduction: reduction,
    line35_per_person: perPerson,
    line36a_taxpayer: taxpayer,
    line36b_spouse: spouse,
    line37_senior: taxpayer + spouse,
    line38_total: taxpayer + spouse,
  });
}

/** W-2 box 7 tips from exactly one qualifying employer, with no other Part II source. */
export function calculateSingleEmployerTipsSchedule1A(
  ctx: NodeContext,
  rawInput: Schedule1AInput,
): SingleEmployerTipsLines {
  if (ctx.taxYear !== 2025) {
    throw new Error("Schedule 1-A tips filing needs tax year 2025");
  }
  const input = inputSchema.parse(rawInput);
  if (!input.senior_zero_exclusions_review) {
    throw new Error(
      "Schedule 1-A tips filing needs sourced zero-exclusion review for Part I",
    );
  }
  if (
    input.qualified_employee_tips?.length !== 1 ||
    (input.qualified_w2_overtime?.length ?? 0) > 0 ||
    (input.vehicle_loans?.length ?? 0) > 0 ||
    seniorDeduction(ctx, input) > 0
  ) {
    throw new Error(
      "Schedule 1-A single-employer tips filing cannot include multiple tip employers, senior, overtime, or vehicle claims",
    );
  }
  if (
    input.magi === undefined || !Number.isSafeInteger(input.magi) ||
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS
  ) {
    throw new Error(
      "Schedule 1-A tips filing needs whole-dollar AGI and eligible filing status",
    );
  }
  const entry = input.qualified_employee_tips[0];
  if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
    throw new Error(
      "Schedule 1-A W-2 box 7 tips must be positive whole dollars",
    );
  }
  if (
    entry.occupation_code === undefined ||
    !isQualifiedTipsOccupationCode(entry.occupation_code) ||
    entry.box5_medicare_wages === undefined ||
    entry.box5_medicare_wages > 176_100
  ) {
    throw new Error(
      "Schedule 1-A W-2 box 7 filing needs a qualifying occupation code and Medicare wages at or below the 2025 social security wage base",
    );
  }
  const employeeSsn = entry.employee_ssn.replaceAll("-", "");
  const taxpayerEligible = employeeSsn ===
      input.taxpayer_ssn?.replaceAll("-", "") &&
    input.taxpayer_has_valid_ssn === true;
  const spouseEligible = input.filing_status === FilingStatus.MFJ &&
    employeeSsn === input.spouse_ssn?.replaceAll("-", "") &&
    input.spouse_has_valid_ssn === true;
  if (!taxpayerEligible && !spouseEligible) {
    throw new Error("Schedule 1-A tips need the recipient's valid SSN");
  }
  const threshold = input.filing_status === FilingStatus.MFJ
    ? TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ
    : TIPS_OVERTIME_PHASEOUT_THRESHOLD;
  const excess = Math.max(0, input.magi - threshold);
  const thousands = Math.floor(excess / 1_000);
  const reduction = thousands * 100;
  const capped = Math.min(entry.amount, QUALIFIED_TIPS_CAP);
  const deduction = Math.max(0, capped - reduction);
  if (deduction <= 0 || deduction !== qualifiedTipsDeduction(input)) {
    throw new Error(
      "Schedule 1-A tips deduction does not reconcile to the source graph",
    );
  }
  return singleEmployerTipsLinesSchema.parse({
    line1_agi: input.magi,
    line3_magi: input.magi,
    line4a_w2_tips: entry.amount,
    line4c_employee_tips: entry.amount,
    line6_total_tips: entry.amount,
    line7_capped_tips: capped,
    line9_threshold: threshold,
    line10_excess_magi: excess,
    line11_thousands: thousands,
    line12_reduction: reduction,
    line13_tips: deduction,
    line38_total: deduction,
  });
}

/** Reviewed FLSA premiums in W-2 box 14 that are included in box 1 wages. */
export function calculateW2OvertimeSchedule1A(
  ctx: NodeContext,
  rawInput: Schedule1AInput,
): W2OvertimeLines {
  if (ctx.taxYear !== 2025) {
    throw new Error("Schedule 1-A overtime filing needs tax year 2025");
  }
  const input = inputSchema.parse(rawInput);
  if (!input.senior_zero_exclusions_review) {
    throw new Error(
      "Schedule 1-A overtime filing needs sourced zero-exclusion review for Part I",
    );
  }
  if (
    !input.qualified_w2_overtime?.length ||
    (input.qualified_employee_tips?.length ?? 0) > 0 ||
    (input.vehicle_loans?.length ?? 0) > 0 ||
    seniorDeduction(ctx, input) > 0
  ) {
    throw new Error(
      "Schedule 1-A W-2 overtime filing cannot include tips, senior, or vehicle claims",
    );
  }
  if (
    input.magi === undefined || !Number.isSafeInteger(input.magi) ||
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS
  ) {
    throw new Error(
      "Schedule 1-A overtime filing needs whole-dollar AGI and eligible filing status",
    );
  }
  const seen = new Set<string>();
  let total = 0;
  for (const entry of input.qualified_w2_overtime) {
    const ssn = entry.employee_ssn.replaceAll("-", "");
    const employer = entry.employer_ein.replaceAll("-", "");
    const key = `${ssn}:${employer}`;
    if (seen.has(key)) {
      throw new Error(
        "Schedule 1-A overtime needs one W-2 premium per employee and employer",
      );
    }
    seen.add(key);
    const taxpayer = ssn === input.taxpayer_ssn?.replaceAll("-", "") &&
      input.taxpayer_has_valid_ssn === true;
    const spouse = input.filing_status === FilingStatus.MFJ &&
      ssn === input.spouse_ssn?.replaceAll("-", "") &&
      input.spouse_has_valid_ssn === true;
    if (!taxpayer && !spouse) {
      throw new Error("Schedule 1-A overtime needs the recipient's valid SSN");
    }
    if (
      !Number.isSafeInteger(entry.amount) || entry.amount <= 0 ||
      !Number.isSafeInteger(entry.box1_wages) ||
      entry.amount > entry.box1_wages
    ) {
      throw new Error(
        "Schedule 1-A W-2 overtime premium must be whole dollars included in box 1",
      );
    }
    total += entry.amount;
  }
  const threshold = input.filing_status === FilingStatus.MFJ
    ? TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ
    : TIPS_OVERTIME_PHASEOUT_THRESHOLD;
  const excess = Math.max(0, input.magi - threshold);
  const thousands = Math.floor(excess / 1_000);
  const reduction = thousands * 100;
  const cap = input.filing_status === FilingStatus.MFJ
    ? OVERTIME_CAP_MFJ
    : OVERTIME_CAP;
  const capped = Math.min(total, cap);
  const deduction = Math.max(0, capped - reduction);
  if (deduction <= 0 || deduction !== qualifiedOvertimeDeduction(input)) {
    throw new Error(
      "Schedule 1-A overtime deduction does not reconcile to the source graph",
    );
  }
  return w2OvertimeLinesSchema.parse({
    line1_agi: input.magi,
    line3_magi: input.magi,
    line14a_w2_overtime: total,
    line14c_total_overtime: total,
    line15_capped_overtime: capped,
    line17_threshold: threshold,
    line18_excess_magi: excess,
    line19_thousands: thousands,
    line20_reduction: reduction,
    line21_overtime: deduction,
    line38_total: deduction,
  });
}

/** Reviewed 2025 purchase loans with no interest deducted elsewhere. */
export function calculateVehicleInterestSchedule1A(
  ctx: NodeContext,
  rawInput: Schedule1AInput,
): VehicleInterestLines {
  if (ctx.taxYear !== 2025) {
    throw new Error("Schedule 1-A vehicle interest filing needs tax year 2025");
  }
  const input = inputSchema.parse(rawInput);
  if (!input.senior_zero_exclusions_review) {
    throw new Error(
      "Schedule 1-A vehicle interest needs sourced zero-exclusion review for Part I",
    );
  }
  if (
    !input.vehicle_loans?.length ||
    (input.qualified_employee_tips?.length ?? 0) > 0 ||
    (input.qualified_w2_overtime?.length ?? 0) > 0 ||
    seniorDeduction(ctx, input) > 0
  ) {
    throw new Error(
      "Schedule 1-A vehicle interest filing cannot include tips, overtime, or senior claims",
    );
  }
  if (
    input.magi === undefined || !Number.isSafeInteger(input.magi) ||
    input.filing_status === undefined
  ) {
    throw new Error(
      "Schedule 1-A vehicle interest needs whole-dollar AGI and filing status",
    );
  }
  const seen = new Set<string>();
  let total = 0;
  for (const loan of input.vehicle_loans) {
    const vin = loan.vin.toUpperCase();
    if (seen.has(vin)) {
      throw new Error("Schedule 1-A vehicle interest needs one entry per VIN");
    }
    seen.add(vin);
    const borrower = loan.borrower_ssn.replaceAll("-", "");
    if (
      borrower !== input.taxpayer_ssn?.replaceAll("-", "") &&
      !(input.filing_status === FilingStatus.MFJ &&
        borrower === input.spouse_ssn?.replaceAll("-", ""))
    ) {
      throw new Error("Schedule 1-A vehicle borrower must be a return filer");
    }
    total += loan.qualified_interest_paid;
  }
  const threshold = input.filing_status === FilingStatus.MFJ
    ? VEHICLE_PHASEOUT_THRESHOLD_MFJ
    : VEHICLE_PHASEOUT_THRESHOLD;
  const excess = Math.max(0, input.magi - threshold);
  const thousands = Math.ceil(excess / 1_000);
  const reduction = thousands * 200;
  const capped = Math.min(total, VEHICLE_INTEREST_CAP);
  const deduction = Math.max(0, capped - reduction);
  if (deduction <= 0 || deduction !== vehicleLoanInterestDeduction(input)) {
    throw new Error(
      "Schedule 1-A vehicle interest deduction does not reconcile to the source graph",
    );
  }
  return vehicleInterestLinesSchema.parse({
    line1_agi: input.magi,
    line3_magi: input.magi,
    line22_vehicles: input.vehicle_loans.map((loan) => ({
      vin: loan.vin.toUpperCase(),
      deducted_elsewhere: 0,
      schedule1a_interest: loan.qualified_interest_paid,
    })),
    line23_total_interest: total,
    line24_capped_interest: capped,
    line26_threshold: threshold,
    line27_excess_magi: excess,
    line28_thousands: thousands,
    line29_reduction: reduction,
    line30_vehicle_interest: deduction,
    line38_total: deduction,
  });
}

class Schedule1ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(ctx: NodeContext, rawInput: Schedule1AInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const enhancedSeniorDeduction = seniorDeduction(ctx, input);
    const vehicleInterestDeduction = vehicleLoanInterestDeduction(input);
    const deduction = qualifiedTipsDeduction(input) +
      qualifiedOvertimeDeduction(input) +
      vehicleInterestDeduction +
      enhancedSeniorDeduction;
    if (deduction === 0) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(f1040, {
          line13b_additional_deductions: deduction,
          schedule1a_line37_senior_deduction: enhancedSeniorDeduction,
        }),
        this.outputNodes.output(standard_deduction, {
          additional_deductions: deduction,
          enhanced_senior_deduction: enhancedSeniorDeduction,
          qualified_vehicle_loan_interest_deduction: vehicleInterestDeduction,
        }),
      ],
    };
  }
}

export const schedule1a = new Schedule1ANode();
