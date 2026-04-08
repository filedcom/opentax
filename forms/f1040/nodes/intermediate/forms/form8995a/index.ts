import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  QBI_THRESHOLD_SINGLE_2025,
  QBI_THRESHOLD_MFJ_2025,
  QBI_PHASE_IN_RANGE_2025,
} from "../../../config/2025.ts";

// ── TY2025 Constants ─────────────────────────────────────────────────────────

const QBI_RATE = 0.20; // IRC §199A(a) — 20% of net QBI
const THRESHOLD_SINGLE = QBI_THRESHOLD_SINGLE_2025; // Rev. Proc. 2024-40 §3.24
const THRESHOLD_MFJ = QBI_THRESHOLD_MFJ_2025; // Rev. Proc. 2024-40 §3.24
const PHASE_IN_RANGE = QBI_PHASE_IN_RANGE_2025; // IRC §199A(b)(3)(B)(ii)
const W2_LIMIT_A_RATE = 0.50; // IRC §199A(b)(2)(A)(i)
const W2_LIMIT_B_WAGE_RATE = 0.25; // IRC §199A(b)(2)(A)(ii)
const UBIA_RATE = 0.025; // IRC §199A(b)(2)(A)(ii)

// ── Schemas ──────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Filing status — determines income threshold for wage limitation phase-in
  filing_status: filingStatusSchema,
  // Taxable income before QBI deduction (Form 1040 line 11)
  taxable_income: z.number().nonnegative(),
  // Net capital gain — reduces income limitation base
  net_capital_gain: z.number().nonnegative().optional(),

  // Non-SSTB qualified business income
  qbi: z.number().optional(),
  // W-2 wages paid by non-SSTB qualified businesses
  w2_wages: z.number().nonnegative().optional(),
  // Unadjusted basis immediately after acquisition (UBIA) of non-SSTB qualified property
  unadjusted_basis: z.number().nonnegative().optional(),

  // SSTB (specified service trade/business) qualified business income
  sstb_qbi: z.number().optional(),
  // W-2 wages paid by SSTB businesses
  sstb_w2_wages: z.number().nonnegative().optional(),
  // UBIA of SSTB qualified property
  sstb_unadjusted_basis: z.number().nonnegative().optional(),

  // Section 199A dividends from REITs (Form 1099-DIV box 5)
  line6_sec199a_dividends: z.number().nonnegative().optional(),

  // Prior-year QBI net loss carryforward (zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  // Prior-year REIT/PTP net loss carryforward (zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),
});

type Form8995AInput = z.infer<typeof inputSchema>;

// ── Threshold helpers ─────────────────────────────────────────────────────────

function threshold(filingStatus: FilingStatus): number {
  return filingStatus === FilingStatus.MFJ ? THRESHOLD_MFJ : THRESHOLD_SINGLE;
}

/**
 * Reduction ratio for phase-in of wage limitation and SSTB phase-out.
 * 0 = below threshold (no limitation), 1 = fully above range (full limitation).
 */
function reductionRatio(taxableIncome: number, filingStatus: FilingStatus): number {
  const base = threshold(filingStatus);
  const excess = taxableIncome - base;
  if (excess <= 0) return 0;
  if (excess >= PHASE_IN_RANGE) return 1;
  return excess / PHASE_IN_RANGE;
}

// ── SSTB adjustment ───────────────────────────────────────────────────────────

type SstbAmounts = {
  readonly qbi: number;
  readonly w2Wages: number;
  readonly unadjustedBasis: number;
};

function adjustedSstbAmounts(input: Form8995AInput, ratio: number): SstbAmounts {
  const scale = 1 - ratio;
  return {
    qbi: (input.sstb_qbi ?? 0) * scale,
    w2Wages: (input.sstb_w2_wages ?? 0) * scale,
    unadjustedBasis: (input.sstb_unadjusted_basis ?? 0) * scale,
  };
}

// ── Combined totals ───────────────────────────────────────────────────────────

type CombinedTotals = {
  readonly netQbi: number;
  readonly w2Wages: number;
  readonly unadjustedBasis: number;
};

function combinedTotals(input: Form8995AInput, sstb: SstbAmounts): CombinedTotals {
  const grossQbi = (input.qbi ?? 0) + sstb.qbi;
  const netQbi = grossQbi + (input.qbi_loss_carryforward ?? 0);
  const w2Wages = (input.w2_wages ?? 0) + sstb.w2Wages;
  const unadjustedBasis = (input.unadjusted_basis ?? 0) + sstb.unadjustedBasis;
  return { netQbi, w2Wages, unadjustedBasis };
}

// ── W-2/UBIA wage limitation ──────────────────────────────────────────────────

function applicableWageLimit(w2Wages: number, unadjustedBasis: number): number {
  const limitA = W2_LIMIT_A_RATE * w2Wages;
  const limitB = W2_LIMIT_B_WAGE_RATE * w2Wages + UBIA_RATE * unadjustedBasis;
  return Math.max(limitA, limitB);
}

// ── QBI component with phase-in ───────────────────────────────────────────────

function qbiComponent(totals: CombinedTotals, ratio: number): number {
  if (totals.netQbi <= 0) return 0;

  const beforeLimit = totals.netQbi * QBI_RATE;

  if (ratio === 0) {
    // Below threshold — no wage limitation applies
    return beforeLimit;
  }

  const wageLimit = applicableWageLimit(totals.w2Wages, totals.unadjustedBasis);

  if (ratio === 1) {
    // Fully above phase-in range — full limitation applies
    return Math.min(beforeLimit, wageLimit);
  }

  // Partial phase-in: limitation is blended in
  const phaseInAmount = ratio * (beforeLimit - wageLimit);
  return beforeLimit - Math.max(0, phaseInAmount);
}

// ── REIT/PTP component ────────────────────────────────────────────────────────

function reitComponent(input: Form8995AInput): number {
  const netReit = (input.line6_sec199a_dividends ?? 0) + (input.reit_loss_carryforward ?? 0);
  if (netReit <= 0) return 0;
  return netReit * QBI_RATE;
}

// ── Income cap ────────────────────────────────────────────────────────────────

function incomeCap(input: Form8995AInput): number {
  const capGain = input.net_capital_gain ?? 0;
  const base = Math.max(0, input.taxable_income - capGain);
  return base * QBI_RATE;
}

// ── Activity check ────────────────────────────────────────────────────────────

function hasQbiActivity(input: Form8995AInput): boolean {
  return (
    (input.qbi ?? 0) !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) > 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  );
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form8995ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(_ctx: NodeContext, rawInput: Form8995AInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasQbiActivity(input)) {
      return { outputs: [] };
    }

    const ratio = reductionRatio(input.taxable_income, input.filing_status);
    const sstb = adjustedSstbAmounts(input, ratio);
    const totals = combinedTotals(input, sstb);

    const qbi = qbiComponent(totals, ratio);
    const reit = reitComponent(input);
    const totalBeforeCap = qbi + reit;

    if (totalBeforeCap <= 0) {
      return { outputs: [] };
    }

    const cap = incomeCap(input);
    const deduction = Math.min(totalBeforeCap, cap);

    if (deduction <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
      this.outputNodes.output(standard_deduction, { qbi_deduction: deduction }),
    ];

    return { outputs };
  }
}

export const form8995a = new Form8995ANode();
