import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

// Part II: flat 20% rate on pre-1974 capital gain portion
const CAPITAL_GAIN_RATE = 0.20;

// Part III: Minimum Distribution Allowance parameters
const MDA_PHASE_OUT_RATE = 0.20;

// Part III: 1986 single-filer rate schedule used for 10-year averaging
// Source: Form 4972 instructions (permanent; does not change year to year)
const BRACKETS_1986: ReadonlyArray<{ over: number; upTo: number; rate: number }> = [
  { over: 0,       upTo: 2_480,    rate: 0.11 },
  { over: 2_480,   upTo: 3_670,    rate: 0.12 },
  { over: 3_670,   upTo: 5_940,    rate: 0.14 },
  { over: 5_940,   upTo: 8_200,    rate: 0.15 },
  { over: 8_200,   upTo: 12_840,   rate: 0.16 },
  { over: 12_840,  upTo: 17_270,   rate: 0.18 },
  { over: 17_270,  upTo: 22_900,   rate: 0.20 },
  { over: 22_900,  upTo: 26_700,   rate: 0.23 },
  { over: 26_700,  upTo: 34_500,   rate: 0.26 },
  { over: 34_500,  upTo: 43_800,   rate: 0.30 },
  { over: 43_800,  upTo: 60_600,   rate: 0.34 },
  { over: 60_600,  upTo: 85_600,   rate: 0.38 },
  { over: 85_600,  upTo: 109_400,  rate: 0.42 },
  { over: 109_400, upTo: 162_400,  rate: 0.45 },
  { over: 162_400, upTo: 215_400,  rate: 0.49 },
  { over: 215_400, upTo: Infinity, rate: 0.50 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total gross distribution amount (from f1099r, box1_gross_distribution)
  lump_sum_amount: z.number().nonnegative(),

  // Pre-1974 capital gain portion (from f1099r, box3_capital_gain)
  capital_gain_amount: z.number().nonnegative().optional(),

  // Eligibility: participant was born before January 2, 1936
  born_before_1936: z.boolean().optional(),

  // Part II election: apply 20% capital gain rate to pre-1974 portion
  elect_capital_gain: z.boolean().optional(),

  // Part III election: apply 10-year averaging using 1986 rate schedule
  elect_10yr_averaging: z.boolean().optional(),

  // Part III, Line 10: death benefit exclusion (pre-1984 plans, max $5,000)
  death_benefit_exclusion: z.number().nonnegative().optional(),
});

type Form4972Input = z.infer<typeof inputSchema>;

// ─── Cross-field validation ────────────────────────────────────────────────────

function validateInput(input: Form4972Input, deathBenefitMax: number): void {
  const capGain = input.capital_gain_amount ?? 0;
  if (capGain > input.lump_sum_amount) {
    throw new Error(
      `form4972: capital_gain_amount (${capGain}) cannot exceed lump_sum_amount (${input.lump_sum_amount})`,
    );
  }
  const deathBenefit = input.death_benefit_exclusion ?? 0;
  if (deathBenefit > deathBenefitMax) {
    throw new Error(
      `form4972: death_benefit_exclusion (${deathBenefit}) cannot exceed ${deathBenefitMax}`,
    );
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Tax on a given income using the 1986 rate schedule (floored to whole dollars)
function taxOn1986Rate(income: number): number {
  let tax = 0;
  for (const bracket of BRACKETS_1986) {
    if (income <= bracket.over) break;
    const taxableInBracket = Math.min(income, bracket.upTo) - bracket.over;
    tax += taxableInBracket * bracket.rate;
  }
  return Math.floor(tax);
}

// Minimum Distribution Allowance (Form 4972, Lines 15–17)
// = min(mdaMax, 50% × ordinaryIncome) − 20% × max(0, ordinaryIncome − phaseOutThreshold)
// Floored at 0; effectively 0 when ordinaryIncome ≥ zeroThreshold
function minimumDistributionAllowance(
  ordinaryIncome: number,
  mdaMax: number,
  phaseOutThreshold: number,
  zeroThreshold: number,
): number {
  if (ordinaryIncome >= zeroThreshold) return 0;
  const baseMda = Math.min(mdaMax, 0.5 * ordinaryIncome);
  const phaseOut = ordinaryIncome > phaseOutThreshold
    ? MDA_PHASE_OUT_RATE * (ordinaryIncome - phaseOutThreshold)
    : 0;
  return Math.max(0, baseMda - phaseOut);
}

// Part II tax: 20% on the capital gain portion (Line 7)
function partIITax(capitalGain: number): number {
  return Math.floor(capitalGain * CAPITAL_GAIN_RATE);
}

// Part III tax: 10-year averaging on ordinary income (Lines 8–18)
// ordinaryIncome = lump_sum_amount − capital_gain_elected − death_benefit_exclusion
function partIIITax(
  ordinaryIncome: number,
  mdaMax: number,
  mdaPhaseOutThreshold: number,
  mdaZeroThreshold: number,
): number {
  if (ordinaryIncome <= 0) return 0;

  // Line 11: 1/10 of ordinary income
  const oneTenth = ordinaryIncome / 10;
  // Line 12–13: tax on line 11, multiplied back by 10
  const tentativeTax = taxOn1986Rate(oneTenth) * 10;

  // Lines 14–17: MDA reduction
  const mdaAmount = minimumDistributionAllowance(ordinaryIncome, mdaMax, mdaPhaseOutThreshold, mdaZeroThreshold);
  const mdaReduction = taxOn1986Rate(mdaAmount / 10) * 10;

  // Line 18: final Part III tax
  return Math.max(0, tentativeTax - mdaReduction);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4972Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4972";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(ctx: NodeContext, rawInput: Form4972Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    // Part I eligibility gate
    if (input.born_before_1936 !== true) {
      return { outputs: [] };
    }

    // Require at least one election
    const electCapGain = input.elect_capital_gain === true;
    const elect10yr = input.elect_10yr_averaging === true;
    if (!electCapGain && !elect10yr) {
      return { outputs: [] };
    }

    validateInput(input, cfg.deathBenefitMax);

    const capitalGain = input.capital_gain_amount ?? 0;
    const deathBenefit = input.death_benefit_exclusion ?? 0;

    // Part II: 20% tax on pre-1974 capital gain (only if elected and > 0)
    const capitalGainElected = electCapGain ? capitalGain : 0;
    const partIITaxAmt = electCapGain ? partIITax(capitalGainElected) : 0;

    // Part III: 10-year averaging on ordinary income portion
    const ordinaryIncome = input.lump_sum_amount - capitalGainElected - deathBenefit;
    const partIIITaxAmt = elect10yr
      ? partIIITax(Math.max(0, ordinaryIncome), cfg.mdaMax, cfg.mdaPhaseOutThreshold, cfg.mdaZeroThreshold)
      : 0;

    const totalTax = partIITaxAmt + partIIITaxAmt;

    // No output when combined tax is zero
    if (totalTax === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule2, { lump_sum_tax: totalTax }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4972 = new Form4972Node();
