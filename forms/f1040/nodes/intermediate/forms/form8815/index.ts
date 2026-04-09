import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule_b } from "../../aggregation/schedule_b/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 8815 — Exclusion of Interest From Series EE and I U.S. Savings Bonds
// IRC §135; TY2025 instructions.
//
// Interest from Series EE bonds issued after 1989 and Series I bonds is
// excludable when used to pay qualified higher education expenses (QHEE),
// subject to AGI phaseout.
//
// Key rules:
//   1. Proceeds (principal + interest) vs. qualified expenses ratio
//      — if expenses >= proceeds, all interest is excludable
//      — if expenses < proceeds, only a proportional share of interest is excludable
//   2. AGI phaseout reduces the excludable amount proportionally
//   3. MFS filing status is ineligible (IRC §135(d)(1))

export const inputSchema = z.object({
  // Total interest from qualifying EE/I bonds redeemed during the year.
  // Form 8815 line 6.
  ee_bond_interest: z.number().nonnegative().optional(),

  // Total proceeds (principal + interest) from bonds redeemed.
  // Form 8815 line 5.
  bond_proceeds: z.number().nonnegative().optional(),

  // Qualified higher education expenses paid during the year.
  // Reduced by tax-free educational assistance (scholarships, employer exclusions, etc.).
  // Form 8815 line 9.
  qualified_expenses: z.number().nonnegative().optional(),

  // Modified AGI for Form 8815 phaseout calculation (Form 8815 line 11).
  // = AGI before this exclusion; see Form 8815 instructions.
  modified_agi: z.number().nonnegative().optional(),

  // Filing status — determines phaseout range; MFS is ineligible.
  filing_status: filingStatusSchema.optional(),
});

type Form8815Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns false when the taxpayer is ineligible (MFS filing status).
// IRC §135(d)(1)
function isEligible(input: Form8815Input): boolean {
  return input.filing_status !== FilingStatus.MFS;
}

// Phaseout start and end thresholds for the given filing status.
function phaseoutRange(
  status: FilingStatus | undefined,
  cfg: import("../../../config/index.ts").F1040Config,
): { start: number; end: number } {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return { start: cfg.savingsBondPhaseoutStartMfj, end: cfg.savingsBondPhaseoutEndMfj };
  }
  return { start: cfg.savingsBondPhaseoutStartSingle, end: cfg.savingsBondPhaseoutEndSingle };
}

// Proportional interest exclusion when expenses < proceeds.
// Form 8815 line 10: excludable = interest × (expenses / proceeds).
// IRC §135(b)(1)(B)
function proportionalExclusion(
  interest: number,
  expenses: number,
  proceeds: number,
): number {
  if (expenses >= proceeds) return interest;
  if (proceeds <= 0) return 0;
  return interest * (expenses / proceeds);
}

// AGI phaseout reduction.
// Form 8815 line 14: exclusion reduced proportionally over the phaseout range.
// IRC §135(b)(2)
function applyPhaseout(
  exclusion: number,
  magi: number,
  start: number,
  end: number,
): number {
  if (magi <= start) return exclusion;
  if (magi >= end) return 0;
  const range = end - start;
  const excess = magi - start;
  const reductionFraction = excess / range;
  return exclusion * (1 - reductionFraction);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8815Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8815";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b]);

  compute(ctx: NodeContext, rawInput: Form8815Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const interest = input.ee_bond_interest ?? 0;
    if (interest === 0) {
      return { outputs: [] };
    }

    // MFS filers are ineligible for the exclusion (IRC §135(d)(1))
    if (!isEligible(input)) {
      return { outputs: [] };
    }

    const expenses = input.qualified_expenses ?? 0;
    if (expenses === 0) {
      // No qualified expenses → no exclusion
      return { outputs: [] };
    }

    const proceeds = input.bond_proceeds ?? interest; // proceeds >= interest always
    const baseExclusion = proportionalExclusion(interest, expenses, proceeds);

    if (baseExclusion <= 0) {
      return { outputs: [] };
    }

    // Apply AGI phaseout
    const magi = input.modified_agi ?? 0;
    const { start, end } = phaseoutRange(input.filing_status, cfg);
    const finalExclusion = applyPhaseout(baseExclusion, magi, start, end);

    if (finalExclusion <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      output(schedule_b, { ee_bond_exclusion: finalExclusion }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8815 = new Form8815Node();
