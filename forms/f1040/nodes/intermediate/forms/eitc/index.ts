import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  EITC_MAX_CREDIT_2025,
  EITC_PHASE_IN_END_2025,
  EITC_PHASEOUT_START_2025,
  EITC_INCOME_LIMIT_2025,
  EITC_INVESTMENT_INCOME_LIMIT_2025,
} from "../../../config/2025.ts";

// ─── TY2025 EITC Tables (Rev Proc 2024-40) — see config/2025.ts ──────────────

const MAX_CREDIT = EITC_MAX_CREDIT_2025;
const PHASE_IN_END = EITC_PHASE_IN_END_2025;
const PHASEOUT_START = EITC_PHASEOUT_START_2025;
const INCOME_LIMIT = EITC_INCOME_LIMIT_2025;
const INVESTMENT_INCOME_LIMIT = EITC_INVESTMENT_INCOME_LIMIT_2025;

// Phase-in rates by number of qualifying children (IRC §32(b)(1))
const PHASE_IN_RATE: Record<number, number> = {
  0: 0.0765,
  1: 0.3400,
  2: 0.4000,
  3: 0.4000, // IRC §32(b)(1)(B): 40% for 3+ children, not 45%
};

// Phaseout rates by number of qualifying children (IRC §32(b))
const PHASEOUT_RATE: Record<number, number> = {
  0: 0.0765,
  1: 0.1598,
  2: 0.2106,
  3: 0.2106,
};

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Earned income from wages (W-2 Box 1), fed by w2 node
  earned_income: z.number().nonnegative().optional(),

  // Net profit from Schedule C (line 31, positive only), fed by schedule_c node
  // IRC §32(c)(2)(A)(ii): net earnings from self-employment count as earned income
  se_net_profit: z.number().nonnegative().optional(),

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
  const earnedIncome = (input.earned_income ?? 0) + (input.se_net_profit ?? 0);
  const agi = input.agi ?? earnedIncome;
  const children = clampChildren(input.qualifying_children ?? 0);
  const isJoint = isJointFiler(input.filing_status);

  // MFS filers are disqualified (IRC §32(d))
  if (input.filing_status === FilingStatus.MFS) return 0;

  // Investment income disqualifier (IRC §32(i))
  if ((input.investment_income ?? 0) > INVESTMENT_INCOME_LIMIT) return 0;

  // Must have earned income
  if (earnedIncome <= 0) return 0;

  // Income limit — use max(earnedIncome, AGI) per IRC §32(a)(2)(B).
  // When AGI exceeds earned income (e.g. large capital gains), AGI controls.
  const phaseoutBase = Math.max(earnedIncome, agi);
  const [limitSingle, limitJoint] = INCOME_LIMIT[children];
  const incomeLimit = isJoint ? limitJoint : limitSingle;
  if (phaseoutBase >= incomeLimit) return 0;

  // Phase-in credit based on earned income
  const creditBeforePhaseout = phaseInCredit(earnedIncome, children);

  // Phaseout based on max(earnedIncome, AGI) per IRC §32(a)(2)(B)
  const finalCredit = phaseOutCredit(creditBeforePhaseout, phaseoutBase, children, isJoint);

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
