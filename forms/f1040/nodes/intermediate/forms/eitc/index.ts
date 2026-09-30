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
  childless_eic_review: childlessEicReviewSchema.optional(),

  // Investment income (interest, dividends, capital gains, rents)
  // If investment_income > eitcInvestmentIncomeLimit, no EITC allowed
  investment_income: z.number().nonnegative().optional(),

  // Set by Form 8862 when prior-year EITC disallowance has been cleared
  form8862_filed: z.boolean().optional(),
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
  if (input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS) return false;
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
    input.childless_eic_review?.
        not_qualifying_child_of_another_taxpayer_verified === true &&
    (input.filing_status !== FilingStatus.HOH ||
      input.childless_eic_review.hoh_unmarried_at_year_end_verified === true);
}

function computeEitc(
  input: EitcInput,
  investmentIncomeLimit: number,
): number {
  const earnedIncome = (input.earned_income ?? 0) +
    (input.se_net_profit ?? 0) - (input.se_tax_deduction ?? 0);
  const agi = input.agi ?? earnedIncome;
  const children = clampChildren(input.qualifying_children ?? 0);
  const isJoint = isJointFiler(input.filing_status);

  if (input.filer_has_valid_ssns !== true) return 0;
  if (input.form2555_filed === true) return 0;

  // A separate return can use the 2025 separated-spouse rule only with a
  // qualifying child and reviewed residence/separation facts.
  if (
    input.filing_status === FilingStatus.MFS &&
    (children === 0 || input.mfs_separation_reviewed !== true)
  ) return 0;

  if (children === 0 && !childlessEicEligible(input)) return 0;

  // Investment income disqualifier (IRC §32(i))
  if ((input.investment_income ?? 0) > investmentIncomeLimit) return 0;

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
