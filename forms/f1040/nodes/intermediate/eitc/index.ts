import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 EITC Tables (Rev Proc 2024-40) ───────────────────────────────────
// Maximum credit amounts by number of qualifying children
const MAX_CREDIT: Record<number, number> = {
  0: 649,
  1: 4_328,
  2: 7_152,
  3: 8_046,
};

// Earned income amounts where credit is at maximum (phase-in ends)
// (Phase-in rate × earned income = max credit)
const PHASE_IN_END: Record<number, number> = {
  0: 8_490,
  1: 12_730,
  2: 17_880,
  3: 17_880,
};

// Phaseout start thresholds by filing status and children
// [single/hoh/mfs, mfj/qss]
const PHASEOUT_START: Record<number, [number, number]> = {
  0: [9_524, 16_810],
  1: [21_560, 28_845],
  2: [21_560, 28_845],
  3: [21_560, 28_845],
};

// Phaseout end (max income) by filing status and children
// [single/hoh/mfs, mfj/qss]
const INCOME_LIMIT: Record<number, [number, number]> = {
  0: [18_591, 25_511],
  1: [49_084, 56_004],
  2: [55_768, 62_688],
  3: [59_899, 66_819],
};

// Phase-in rates by number of qualifying children (IRC §32(b))
const PHASE_IN_RATE: Record<number, number> = {
  0: 0.0765,
  1: 0.3400,
  2: 0.4000,
  3: 0.4500,
};

// Phaseout rates by number of qualifying children (IRC §32(b))
const PHASEOUT_RATE: Record<number, number> = {
  0: 0.0765,
  1: 0.1598,
  2: 0.2106,
  3: 0.2106,
};

// TY2025 investment income limit (Rev Proc 2024-40)
const INVESTMENT_INCOME_LIMIT = 11_950;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Earned income: wages, SE net profit (after 1/2 SE tax deduction)
  earned_income: z.number().nonnegative().optional(),

  // Adjusted Gross Income — used for EITC phaseout when AGI > earned income
  agi: z.number().nonnegative().optional(),

  // Number of qualifying children (0, 1, 2, or 3+)
  qualifying_children: z.number().int().min(0).max(3).optional(),

  // Filing status — determines phaseout thresholds
  filing_status: filingStatusSchema.optional(),

  // Investment income (interest, dividends, capital gains, rents)
  // If investment_income > INVESTMENT_INCOME_LIMIT, no EITC allowed
  investment_income: z.number().nonnegative().optional(),

  // Set by Form 8862 when prior-year EITC disallowance has been cleared
  form8862_filed: z.boolean().optional(),
});

type EitcInput = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function isJointFiler(status: FilingStatus | undefined): boolean {
  return status === FilingStatus.MFJ || status === FilingStatus.QSS;
}

function clampChildren(children: number): number {
  // IRS treats 3+ the same
  return Math.min(children, 3);
}

function phaseInCredit(earnedIncome: number, children: number): number {
  const rate = PHASE_IN_RATE[children];
  const maxCredit = MAX_CREDIT[children];
  const phaseInEnd = PHASE_IN_END[children];

  if (earnedIncome <= 0) return 0;

  // Credit phases in at rate × earned income up to maximum
  if (earnedIncome >= phaseInEnd) return maxCredit;
  return Math.min(rate * earnedIncome, maxCredit);
}

function phaseOutCredit(credit: number, agI: number, children: number, isJoint: boolean): number {
  const [startSingle, startJoint] = PHASEOUT_START[children];
  const phaseoutStart = isJoint ? startJoint : startSingle;

  if (agI <= phaseoutStart) return credit;

  const rate = PHASEOUT_RATE[children];
  const reduction = rate * (agI - phaseoutStart);
  return Math.max(0, credit - reduction);
}

function computeEitc(input: EitcInput): number {
  const earnedIncome = input.earned_income ?? 0;
  const agi = input.agi ?? earnedIncome;
  const children = clampChildren(input.qualifying_children ?? 0);
  const isJoint = isJointFiler(input.filing_status);

  // Investment income disqualifier (IRC §32(i))
  if ((input.investment_income ?? 0) > INVESTMENT_INCOME_LIMIT) return 0;

  // Must have earned income
  if (earnedIncome <= 0) return 0;

  // Income limit — if AGI or earned income exceeds limit, no credit
  const [limitSingle, limitJoint] = INCOME_LIMIT[children];
  const incomeLimit = isJoint ? limitJoint : limitSingle;
  const higherIncome = Math.max(earnedIncome, agi);
  if (higherIncome >= incomeLimit) return 0;

  // Phase-in credit based on earned income
  const creditBeforePhaseout = phaseInCredit(earnedIncome, children);

  // Phaseout based on the higher of earned income or AGI
  const finalCredit = phaseOutCredit(creditBeforePhaseout, higherIncome, children, isJoint);

  return Math.round(finalCredit);
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

  compute(_ctx: NodeContext, rawInput: EitcInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = computeEitc(input);
    return { outputs: buildOutput(credit) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const eitc = new EitcNode();
