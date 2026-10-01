import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { FilingStatus } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Schedule R base amounts (IRC §22(c)(2)(A))
// Rev. Proc. 2024-40 (these are not inflation-adjusted — fixed by statute)
const BASE_AMOUNT: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 5000,
  [FilingStatus.MFJ]: 7500, // both 65+ or both disabled
  [FilingStatus.MFS]: 3750,
  [FilingStatus.HOH]: 5000,
  [FilingStatus.QSS]: 5000,
};

// MFJ — one spouse qualifies: base $5,000; both qualify: $7,500
const MFJ_ONE_BASE = 5000;
const MFJ_BOTH_BASE = 7500;

// TY2025 — AGI phaseout thresholds (IRC §22(d)(1))
const AGI_PHASEOUT: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 7500,
  [FilingStatus.MFJ]: 10000,
  [FilingStatus.MFS]: 5000,
  [FilingStatus.HOH]: 7500,
  [FilingStatus.QSS]: 7500,
};

const disabilityEvidenceSchema = z.object({
  retired_on_permanent_total_disability: z.literal(true),
  below_mandatory_retirement_age_on_january_1: z.literal(true),
  unable_to_perform_substantial_gainful_activity: z.literal(true),
  condition_expected_to_last_one_year_or_result_in_death_verified: z.literal(
    true,
  ),
  disability_income_source_reference: z.string().trim().min(1),
  disability_income_reported_on: z.enum(["wages", "pension"]),
  eligibility_source_reference: z.string().trim().min(1),
  physician_statement: z.enum(["prior_year", "current_year", "va_21_0172"]),
  physician_statement_source_reference: z.string().trim().min(1),
  physician_or_va_statement_signed_verified: z.literal(true),
  prior_year_line_b_or_1983_verified: z.literal(true).optional(),
});

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  // Taxpayer age 65 or older at end of tax year
  taxpayer_age_65_or_older: z.boolean().optional(),
  // Spouse age 65 or older (MFJ only)
  spouse_age_65_or_older: z.boolean().optional(),
  // Taxpayer has total and permanent disability with disability income
  taxpayer_disabled: z.boolean().optional(),
  // Spouse has total and permanent disability (MFJ only)
  spouse_disabled: z.boolean().optional(),
  // Taxpayer's disability income (if under 65 and disabled)
  taxpayer_disability_income: z.number().nonnegative().optional(),
  // Spouse's disability income (if under 65 and disabled, MFJ)
  spouse_disability_income: z.number().nonnegative().optional(),
  // AGI (Form 1040 line 11) — for phaseout calculation
  agi: z.number().nonnegative().optional(),
  // Nontaxable Social Security / RRB benefits
  nontaxable_ssa: z.number().nonnegative().optional(),
  // Nontaxable pension / annuity income excluded from gross income
  nontaxable_pension: z.number().nonnegative().optional(),
  // Nontaxable VA benefits
  nontaxable_va: z.number().nonnegative().optional(),
  // Provenance for the bounded age-65 taxpayer filing path. The source facts
  // must be checked against the final Form 1040 before a native form is built.
  age_65_source_reference: z.string().trim().min(1).optional(),
  spouse_age_65_source_reference: z.string().trim().min(1).optional(),
  mfs_lived_apart_all_year_source_reference: z.string().trim().min(1)
    .optional(),
  nontaxable_ssa_source_reference: z.string().trim().min(1).optional(),
  nontaxable_pension_source_reference: z.string().trim().min(1).optional(),
  nontaxable_va_source_reference: z.string().trim().min(1).optional(),
  nontaxable_pension_line13b_eligible_verified: z.literal(true).optional(),
  nontaxable_va_veterans_pension_verified: z.literal(true).optional(),
  // Reviewed facts for each under-65 person claiming the disability route.
  taxpayer_disability_evidence: disabilityEvidenceSchema.optional(),
  spouse_disability_evidence: disabilityEvidenceSchema.optional(),
});

type ScheduleRInput = z.infer<typeof inputSchema>;

type DisabilityEvidence = NonNullable<
  ScheduleRInput["taxpayer_disability_evidence"]
>;

export function validDisabilityEvidence(
  evidence: DisabilityEvidence | undefined,
): boolean {
  return evidence !== undefined &&
    (evidence.physician_statement !== "prior_year" ||
      evidence.prior_year_line_b_or_1983_verified === true);
}

// Whether the taxpayer qualifies for Schedule R (age 65+ or disabled)
function taxpayerQualifies(input: ScheduleRInput): boolean {
  return input.taxpayer_age_65_or_older === true ||
    input.taxpayer_disabled === true;
}

function spouseQualifies(input: ScheduleRInput): boolean {
  return input.spouse_age_65_or_older === true ||
    input.spouse_disabled === true;
}

// Step 1 — Determine initial amount (Part II)
function initialAmount(input: ScheduleRInput): number {
  const status = input.filing_status;

  if (status === FilingStatus.MFJ) {
    const tQual = taxpayerQualifies(input);
    const sQual = spouseQualifies(input);
    if (tQual && sQual) return MFJ_BOTH_BASE;
    if (tQual || sQual) return MFJ_ONE_BASE;
    return 0;
  }

  if (!taxpayerQualifies(input)) return 0;
  return BASE_AMOUNT[status];
}

// Step 2 — Cap by disability income if taxpayer is under 65 but disabled
function capByDisabilityIncome(input: ScheduleRInput, initial: number): number {
  // Only applies if the qualifying condition is disability (not age)
  const tByDisability = input.taxpayer_disabled === true &&
    input.taxpayer_age_65_or_older !== true;
  const sByDisability = input.spouse_disabled === true &&
    input.spouse_age_65_or_older !== true;

  if (!tByDisability && !sByDisability) return initial;

  const disabilityIncome =
    (tByDisability ? (input.taxpayer_disability_income ?? 0) : 0) +
    (sByDisability ? (input.spouse_disability_income ?? 0) : 0);

  // Box 6 combines one age-qualified spouse's $5,000 with the younger
  // spouse's taxable disability income before applying the $7,500 ceiling.
  const oneOlderJointSpouse = input.filing_status === FilingStatus.MFJ &&
    ((input.taxpayer_age_65_or_older === true && sByDisability) ||
      (input.spouse_age_65_or_older === true && tByDisability));
  return Math.min(
    initial,
    disabilityIncome + (oneOlderJointSpouse ? 5_000 : 0),
  );
}

// Step 3 — Reduce by nontaxable SSA/RRB/VA benefits
function reduceByNontaxableBenefits(
  input: ScheduleRInput,
  amount: number,
): number {
  const nontaxable = (input.nontaxable_ssa ?? 0) +
    (input.nontaxable_pension ?? 0) +
    (input.nontaxable_va ?? 0);
  return Math.max(0, amount - nontaxable);
}

// Step 4 — AGI phaseout: reduce by 50% of excess AGI over threshold
function agiPhaseout(input: ScheduleRInput, amount: number): number {
  const agi = input.agi ?? 0;
  const threshold = AGI_PHASEOUT[input.filing_status];
  const excess = Math.max(0, agi - threshold);
  const reduction = Math.round(excess * 0.5);
  return Math.max(0, amount - reduction);
}

// Step 5 — Final credit = 15% of the resulting amount
function computeCredit(input: ScheduleRInput): number {
  let amount = initialAmount(input);
  if (amount === 0) return 0;

  amount = capByDisabilityIncome(input, amount);
  amount = reduceByNontaxableBenefits(input, amount);
  amount = agiPhaseout(input, amount);

  return Math.round(amount * 0.15);
}

class ScheduleRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const credit = computeCredit(parsed);

    if (credit === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      output(schedule3, { line6d_elderly_disabled_credit: credit }),
    ];
    const taxpayerDisability = parsed.taxpayer_disabled === true &&
      parsed.taxpayer_age_65_or_older !== true;
    const spouseDisability = parsed.spouse_disabled === true &&
      parsed.spouse_age_65_or_older !== true;
    if (
      (taxpayerDisability || spouseDisability) &&
      (!taxpayerDisability ||
        validDisabilityEvidence(parsed.taxpayer_disability_evidence)) &&
      (!spouseDisability ||
        validDisabilityEvidence(parsed.spouse_disability_evidence))
    ) {
      outputs.push(output(f1040, { schedule_r_disability_qualified: true }));
    }

    return { outputs };
  }
}

export const schedule_r = new ScheduleRNode();
