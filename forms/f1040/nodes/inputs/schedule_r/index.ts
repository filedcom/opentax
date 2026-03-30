import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { FilingStatus } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Schedule R base amounts (IRC §22(c)(2)(A))
// Rev. Proc. 2024-40 (these are not inflation-adjusted — fixed by statute)
const BASE_AMOUNT: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 5000,
  [FilingStatus.MFJ]: 7500,   // both 65+ or both disabled
  [FilingStatus.MFS]: 3750,
  [FilingStatus.HOH]: 5000,
  [FilingStatus.QSS]: 7500,
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
  [FilingStatus.QSS]: 10000,
};

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
});

type ScheduleRInput = z.infer<typeof inputSchema>;

// Whether the taxpayer qualifies for Schedule R (age 65+ or disabled)
function taxpayerQualifies(input: ScheduleRInput): boolean {
  return input.taxpayer_age_65_or_older === true || input.taxpayer_disabled === true;
}

function spouseQualifies(input: ScheduleRInput): boolean {
  return input.spouse_age_65_or_older === true || input.spouse_disabled === true;
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
  const tByDisability = input.taxpayer_disabled === true && input.taxpayer_age_65_or_older !== true;
  const sByDisability = input.spouse_disabled === true && input.spouse_age_65_or_older !== true;

  if (!tByDisability && !sByDisability) return initial;

  const disabilityIncome = (tByDisability ? (input.taxpayer_disability_income ?? 0) : 0) +
    (sByDisability ? (input.spouse_disability_income ?? 0) : 0);

  return Math.min(initial, disabilityIncome);
}

// Step 3 — Reduce by nontaxable SSA/RRB/VA benefits
function reduceByNontaxableBenefits(input: ScheduleRInput, amount: number): number {
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
  const reduction = excess * 0.5;
  return Math.max(0, amount - reduction);
}

// Step 5 — Final credit = 15% of the resulting amount
function computeCredit(input: ScheduleRInput): number {
  let amount = initialAmount(input);
  if (amount === 0) return 0;

  amount = capByDisabilityIncome(input, amount);
  amount = reduceByNontaxableBenefits(input, amount);
  amount = agiPhaseout(input, amount);

  return Math.round(amount * 0.15 * 100) / 100;
}

class ScheduleRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const credit = computeCredit(parsed);

    if (credit === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      output(schedule3, { line6d_elderly_disabled_credit: credit }),
    ];

    return { outputs };
  }
}

export const schedule_r = new ScheduleRNode();
