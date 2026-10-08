import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { lookupEic2025 } from "./table_2025.ts";
import { eicBirthResidencyReviewSchema } from "../../../../2025/domains/credits/earned-income/eic-birth-residency.ts";

import { eicDatedResidencyReviewSchema } from "../../../../2025/domains/credits/earned-income/eic-dated-residency.ts";

import { eicDeathResidencyReviewSchema } from "../../../../2025/domains/credits/earned-income/eic-death-residency.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const qualifyingChildDetailSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  name_control: z.string().optional(),
  ssn: z.string(),
  ssn_valid_for_employment: z.boolean().optional(),
  tin_issued_by_due_date: z.boolean().optional(),
  dob: z.string(),
  irs_relationship_code: z.string().optional(),
  months_in_home: z.number().int().min(0).max(12),
  months_lived_with_you_in_us: z.number().int().min(0).max(12),
  eic_birth_residency_review: eicBirthResidencyReviewSchema.optional(),
  eic_dated_residency_review: eicDatedResidencyReviewSchema.optional(),
  eic_death_residency_review: eicDeathResidencyReviewSchema.optional(),
  full_time_student: z.boolean().optional(),
  disabled: z.boolean().optional(),
  ip_pin: z.string().optional(),
});
export type QualifyingChildDetail = z.infer<typeof qualifyingChildDetailSchema>;

export const childlessEicReviewSchema = z.object({
  not_qualifying_child_of_another_taxpayer_verified: z.literal(true),
  qualifying_child_status_record_reference: z.string().trim().min(1),
  hoh_unmarried_at_year_end_verified: z.literal(true).optional(),
}).strict();

export const childEicFilerReviewSchema = z.object({
  not_qualifying_child_of_another_taxpayer_verified: z.literal(true),
  relationship_age_residence_record_reference: z.string().trim().min(1),
}).strict();

/** Pub. 596 rule 4: any nonresident period needs a joint full-year election. */
export const eicTaxResidencyReviewSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("all_year_resident"),
    taxpayer_status_record_reference: z.string().trim().min(1),
    spouse_status_record_reference: z.string().trim().min(1).optional(),
  }).strict(),
  z.object({
    status: z.literal("joint_new_election"),
    elected_person: z.enum(["taxpayer", "spouse"]),
    elected_spouse_nonresident_at_year_end_verified: z.literal(true),
    other_spouse_citizen_or_resident_at_year_end_verified: z.literal(true),
    worldwide_income_included_verified: z.literal(true),
    status_record_reference: z.string().trim().min(1),
    signed_statement_file_name: z.string().trim().min(1),
    signed_statement_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    statement_signed_by_both_verified: z.literal(true),
  }).strict(),
  z.object({
    status: z.literal("joint_prior_election"),
    elected_person: z.enum(["taxpayer", "spouse"]),
    election_still_in_effect_verified: z.literal(true),
    at_least_one_spouse_citizen_or_resident_during_2025_verified: z.literal(
      true,
    ),
    worldwide_income_included_verified: z.literal(true),
    prior_joint_return_reference: z.string().trim().min(1),
    prior_signed_statement_reference: z.string().trim().min(1),
  }).strict(),
]);
export type EicTaxResidencyReview = z.infer<
  typeof eicTaxResidencyReviewSchema
>;

export const priorEicDisallowanceReviewSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("none"),
    irs_account_record_reference: z.string().trim().min(1),
    no_nonclerical_disallowance_since_1996_verified: z.literal(true),
  }).strict(),
  z.object({
    status: z.literal("math_or_clerical_only"),
    irs_notice_reference: z.string().trim().min(1),
    no_other_disallowance_verified: z.literal(true),
  }).strict(),
  z.object({
    status: z.literal("reinstated"),
    disallowance_notice_reference: z.string().trim().min(1),
    later_allowance_notice_reference: z.string().trim().min(1),
    no_new_disallowance_verified: z.literal(true),
  }).strict(),
  z.object({
    status: z.literal("childless_exception"),
    disallowance_notice_reference: z.string().trim().min(1),
    disallowed_only_for_child_qualification_verified: z.literal(true),
    no_other_disallowance_verified: z.literal(true),
    no_active_ban_verified: z.literal(true),
  }).strict(),
  z.object({
    status: z.literal("requires_8862"),
    disallowed_year: z.number().int().min(1997).max(2024),
    disallowance_notice_reference: z.string().trim().min(1),
  }).strict(),
]);

export const inputSchema = z.object({
  // Earned income from wages (W-2 Box 1), fed by w2 node
  earned_income: z.number().nonnegative().optional(),

  // Net profit from Schedule C (line 31, positive only), fed by schedule_c node
  // IRC §32(c)(2)(A)(ii): net earnings from self-employment count as earned income
  se_net_profit: z.number().nonnegative().optional(),
  // Worksheet B Part 1 line 1d: Schedule SE line 13 reduces SE earned income.
  se_tax_deduction: z.number().nonnegative().optional(),

  // Adjusted Gross Income — used for EITC phaseout when AGI > earned income
  agi: z.number().optional(),

  // Number of qualifying children (0, 1, 2, or 3+)
  qualifying_children: z.number().int().min(0).max(3).optional(),
  qualifying_child_details: z.array(qualifyingChildDetailSchema).max(3)
    .optional(),

  // Filing status — determines phaseout thresholds
  filing_status: filingStatusSchema.optional(),
  mfs_separation_reviewed: z.boolean().optional(),
  filer_has_valid_ssns: z.boolean().optional(),
  taxpayer_dob: z.string().date().optional(),
  spouse_dob: z.string().date().optional(),
  taxpayer_death_date: z.string().date().optional(),
  spouse_death_date: z.string().date().optional(),
  main_home_in_us_over_half_year: z.boolean().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  childless_eic_review: childlessEicReviewSchema.optional(),
  child_eic_filer_review: childEicFilerReviewSchema.optional(),
  prior_eic_disallowance_review: priorEicDisallowanceReviewSchema.optional(),
  eic_tax_residency_review: eicTaxResidencyReviewSchema.optional(),
  do_not_claim_eic: z.boolean().optional(),

  // Investment income (interest, dividends, capital gains, rents)
  // If investment_income > eitcInvestmentIncomeLimit, no EITC allowed
  investment_income: z.number().nonnegative().optional(),
  // Pub. 596 Worksheet 1 lines 1–3, routed from the filed income sources.
  investment_income_floor: z.number().nonnegative().optional(),

  // A filed Form 8862 can satisfy the reviewed prior-disallowance route.
  form8862_filed: z.boolean().optional(),
  form8862_disallowed_year: z.number().int().min(1997).max(2024).optional(),
  form8862_notice_reference: z.string().trim().min(1).optional(),
  form2555_filed: z.boolean().optional(),
});

export type EitcInput = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function isJointFiler(status: FilingStatus | undefined): boolean {
  return status === FilingStatus.MFJ;
}

function clampChildren(children: number): number {
  // IRS treats 3+ the same
  return Math.min(children, 3);
}

function meetsChildlessAgeTest(
  dob: string | undefined,
  deathDate: string | undefined,
): boolean {
  if (dob === undefined) return false;
  if (deathDate === undefined) {
    return dob > "1960-12-31" && dob < "2001-01-02";
  }
  if (!deathDate.startsWith("2025-")) return false;
  const year = Number(dob.slice(0, 4));
  const month = Number(dob.slice(5, 7));
  const day = Number(dob.slice(8, 10));
  const age25 = new Date(Date.UTC(year + 25, month - 1, day));
  age25.setUTCDate(age25.getUTCDate() - 1);
  const age65 = new Date(Date.UTC(year + 65, month - 1, day));
  return deathDate >= age25.toISOString().slice(0, 10) &&
    deathDate < age65.toISOString().slice(0, 10);
}

export function childlessEicEligible(input: EitcInput): boolean {
  if (
    input.taxpayer_can_be_claimed_as_dependent === true ||
    input.spouse_can_be_claimed_as_dependent === true
  ) return false;
  if (
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS
  ) return false;
  const isJoint = isJointFiler(input.filing_status);
  const ageEligible = meetsChildlessAgeTest(
    input.taxpayer_dob,
    input.taxpayer_death_date,
  ) || (isJoint &&
    meetsChildlessAgeTest(input.spouse_dob, input.spouse_death_date));
  if (!ageEligible || input.main_home_in_us_over_half_year !== true) {
    return false;
  }
  if (isJoint) return true;
  return input.taxpayer_can_be_claimed_as_dependent === false &&
    input.childless_eic_review
        ?.not_qualifying_child_of_another_taxpayer_verified === true &&
    (input.filing_status !== FilingStatus.HOH ||
      input.childless_eic_review.hoh_unmarried_at_year_end_verified === true);
}

export function childEicFilerEligible(input: EitcInput): boolean {
  if (
    input.taxpayer_can_be_claimed_as_dependent === true ||
    input.spouse_can_be_claimed_as_dependent === true
  ) return false;
  if (input.filing_status === FilingStatus.MFJ) return true;
  if (input.filing_status === FilingStatus.MFS) {
    return input.mfs_separation_reviewed === true;
  }
  return input.filing_status !== undefined &&
    input.child_eic_filer_review
        ?.not_qualifying_child_of_another_taxpayer_verified === true;
}

export function priorEicDisallowanceEligible(
  input: EitcInput,
  children: number,
): boolean {
  const review = input.prior_eic_disallowance_review;
  if (review === undefined) return false;
  if (review.status === "childless_exception") {
    return children === 0 && input.form8862_filed !== true;
  }
  if (review.status !== "requires_8862") {
    return input.form8862_filed !== true;
  }
  return input.form8862_filed === true &&
    input.form8862_disallowed_year === review.disallowed_year &&
    input.form8862_notice_reference ===
      review.disallowance_notice_reference;
}

export function eicTaxResidencyEligible(input: EitcInput): boolean {
  const review = input.eic_tax_residency_review;
  if (!review) return false;
  if (review.status === "all_year_resident") {
    return input.filing_status !== FilingStatus.MFJ ||
      review.spouse_status_record_reference !== undefined;
  }
  return input.filing_status === FilingStatus.MFJ;
}

function computeEitc(
  input: EitcInput,
  investmentIncomeLimit: number,
): number {
  if (input.do_not_claim_eic === true) return 0;
  const earnedIncome = (input.earned_income ?? 0) +
    (input.se_net_profit ?? 0) - (input.se_tax_deduction ?? 0);
  const agi = input.agi ?? earnedIncome;
  const children = clampChildren(input.qualifying_children ?? 0);
  const isJoint = isJointFiler(input.filing_status);

  if (input.filer_has_valid_ssns !== true) return 0;
  if (!eicTaxResidencyEligible(input)) return 0;
  if (input.form2555_filed === true) return 0;
  if (!priorEicDisallowanceEligible(input, children)) return 0;

  // A separate return can use the 2025 separated-spouse rule only with a
  // qualifying child and reviewed residence/separation facts.
  if (
    input.filing_status === FilingStatus.MFS &&
    (children === 0 || input.mfs_separation_reviewed !== true)
  ) return 0;

  if (children === 0 && !childlessEicEligible(input)) return 0;
  if (children > 0 && !childEicFilerEligible(input)) return 0;

  // Investment income disqualifier (IRC §32(i))
  if (
    Math.max(input.investment_income ?? 0, input.investment_income_floor ?? 0) >
      investmentIncomeLimit
  ) return 0;

  // Must have earned income
  if (earnedIncome <= 0) return 0;

  // Worksheet A/B: look up earned income first. AGI gets a second lookup only
  // at or above the worksheet threshold, then the smaller credit controls.
  const earnedCredit = lookupEic2025(earnedIncome, children, isJoint);
  const agiComparisonThreshold = children === 0
    ? (isJoint ? 17_730 : 10_620)
    : (isJoint ? 30_470 : 23_350);
  if (agi < agiComparisonThreshold) return earnedCredit;
  return Math.min(earnedCredit, lookupEic2025(agi, children, isJoint));
}

function buildOutput(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [output(f1040, { line27_eitc: credit })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class EitcNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "eitc";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(ctx: NodeContext, rawInput: EitcInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

    const input = inputSchema.parse(rawInput);
    const credit = computeEitc(input, cfg.eitcInvestmentIncomeLimit);
    return {
      outputs: [
        ...buildOutput(credit),
        {
          nodeType: this.nodeType,
          fields: {
            credit_amount: credit,
            investment_income_floor: input.investment_income_floor ?? 0,
            qualifying_children: input.qualifying_children ?? 0,
            qualifying_child_details: input.qualifying_child_details ?? [],
          },
        },
      ],
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const eitc = new EitcNode();
