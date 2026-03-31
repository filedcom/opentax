import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { FilingStatus } from "../../../types.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import {
  AMT_EXEMPTION_2025,
  AMT_PHASE_OUT_START_2025,
  AMT_BRACKET_26_THRESHOLD_STANDARD_2025,
  AMT_BRACKET_26_THRESHOLD_MFS_2025,
  AMT_BRACKET_ADJUSTMENT_STANDARD_2025,
  AMT_BRACKET_ADJUSTMENT_MFS_2025,
} from "../../../config/2025.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────
// Source: IRS Instructions for Form 6251 (2025); config/2025.ts

const EXEMPTION = AMT_EXEMPTION_2025;
const PHASE_OUT_START = AMT_PHASE_OUT_START_2025;

// Phase-out rate: 25% of excess above threshold (IRC §55(d); Form 6251 Line 5 Worksheet, Step 5)
const PHASE_OUT_RATE = 0.25;

const BRACKET_26_THRESHOLD_STANDARD = AMT_BRACKET_26_THRESHOLD_STANDARD_2025;
const BRACKET_26_THRESHOLD_MFS = AMT_BRACKET_26_THRESHOLD_MFS_2025;
const BRACKET_ADJUSTMENT_STANDARD = AMT_BRACKET_ADJUSTMENT_STANDARD_2025;
const BRACKET_ADJUSTMENT_MFS = AMT_BRACKET_ADJUSTMENT_MFS_2025;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Filing status determines exemption amounts and rate bracket thresholds
  filing_status: z.nativeEnum(FilingStatus),

  // Regular taxable income (approximately Form 1040 line 15).
  // This is the base AMTI before adjustments and preference items.
  // IRC §55(b)(2); Form 6251 Line 1
  regular_tax_income: z.number().nonnegative(),

  // Regular tax liability for AMT comparison.
  // Form 1040 line 16 minus any Form 4972 tax on lump-sum distributions.
  // IRC §55(c)(1); Form 6251 Line 10
  regular_tax: z.number().nonnegative(),

  // Line 2i — ISO exercise adjustment.
  // Excess of FMV of stock acquired through ISO over exercise price.
  // Not recognized for regular tax but included in AMTI.
  // IRC §56(b)(3); Form 6251 Line 2i
  iso_adjustment: z.number().optional(),

  // Line 2l — Post-1986 depreciation adjustment.
  // Difference between AMT and regular-tax depreciation (positive = AMT > regular).
  // IRC §56(a)(1); Form 6251 Line 2l
  depreciation_adjustment: z.number().optional(),

  // Line 2f — Alternative Tax Net Operating Loss Deduction (ATNOLD).
  // Enter as negative number (reduces AMTI). Limited to 90% of AMTI.
  // IRC §56(d); Form 6251 Line 2f
  nol_adjustment: z.number().optional(),

  // Line 2g — Tax-exempt interest income from private activity bonds.
  // Must be included in AMTI even though excluded for regular tax.
  // IRC §57(a)(5); Form 6251 Line 2g
  private_activity_bond_interest: z.number().nonnegative().optional(),
  // Line 2g — Private activity bond interest (alias used by f1099int and f1099div)
  line2g_pab_interest: z.number().nonnegative().optional(),

  // Line 2h — 7% of qualified small business stock gain excluded under §1202.
  // IRC §57(a)(7); Form 6251 Line 2h
  qsbs_adjustment: z.number().nonnegative().optional(),

  // Line 2a — Taxes from Schedule A (state/local taxes deducted for regular tax)
  // AMT addback: taxes deducted on Schedule A are added back to AMTI.
  // IRC §56(b)(1)(A)(ii); Form 6251 Line 2a
  line2a_taxes_paid: z.number().nonnegative().optional(),

  // Lines 2a–2e, 2j–2t, 3 — net of all other AMT adjustments and preference items.
  // Positive increases AMTI; negative decreases AMTI.
  // Enter the combined net amount for all remaining adjustments.
  other_adjustments: z.number().optional(),

  // Line 8 — AMT Foreign Tax Credit (AMTFTC).
  // Offsets tentative minimum tax. Cannot reduce TMT below zero.
  // IRC §59(a); Form 6251 Line 8
  amtftc: z.number().nonnegative().optional(),
});

type Form6251Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Form 6251 Line 4: Alternative Minimum Taxable Income (AMTI)
// AMTI = regular_tax_income + all adjustments and preference items
// IRC §55(b)(2); Form 6251 Lines 1–4
function computeAmti(input: Form6251Input): number {
  return (
    input.regular_tax_income +
    (input.line2a_taxes_paid ?? 0) +
    (input.iso_adjustment ?? 0) +
    (input.depreciation_adjustment ?? 0) +
    (input.nol_adjustment ?? 0) +
    (input.private_activity_bond_interest ?? 0) +
    (input.line2g_pab_interest ?? 0) +
    (input.qsbs_adjustment ?? 0) +
    (input.other_adjustments ?? 0)
  );
}

// Form 6251 Line 5 Worksheet: compute the exemption amount with phase-out
// Full exemption phases out at 25¢ per dollar of AMTI above the threshold.
// Exemption = max(0, full_exemption − 25% × max(0, AMTI − phase_out_start))
// IRC §55(d); Form 6251 Instructions page 9
function computeExemption(amti: number, status: FilingStatus): number {
  const fullExemption = EXEMPTION[status];
  const phaseOutStart = PHASE_OUT_START[status];
  const excess = Math.max(0, amti - phaseOutStart);
  const reduction = Math.floor(excess * PHASE_OUT_RATE);
  return Math.max(0, fullExemption - reduction);
}

// Form 6251 Line 6: Taxable excess (AMTI minus exemption)
// Line 6 = max(0, Line 4 − Line 5)
function computeTaxableExcess(amti: number, exemption: number): number {
  return Math.max(0, amti - exemption);
}

// Form 6251 Line 7: Tentative Minimum Tax using 26%/28% rate structure
// MFS filers use a halved bracket threshold ($119,550 vs $239,100).
// For line6 ≤ threshold:   TMT = line6 × 26%
// For line6 > threshold:   TMT = line6 × 28% − adjustment
// Source: IRS Instructions for Form 6251 (2025), "Line 7" / "What's New"
function computeTentativeMinimumTax(
  taxableExcess: number,
  status: FilingStatus,
): number {
  if (taxableExcess === 0) return 0;
  const threshold = status === FilingStatus.MFS
    ? BRACKET_26_THRESHOLD_MFS
    : BRACKET_26_THRESHOLD_STANDARD;
  const adjustment = status === FilingStatus.MFS
    ? BRACKET_ADJUSTMENT_MFS
    : BRACKET_ADJUSTMENT_STANDARD;
  if (taxableExcess <= threshold) {
    return Math.floor(taxableExcess * 0.26);
  }
  return Math.floor(taxableExcess * 0.28 - adjustment);
}

// Form 6251 Line 9: TMT net of AMTFTC. Cannot be negative.
// Line 9 = max(0, Line 7 − Line 8)
function computeNetTmt(tmt: number, amtftc: number): number {
  return Math.max(0, tmt - amtftc);
}

// Form 6251 Line 11: AMT liability = max(0, net TMT − regular tax)
// Only positive when tentative minimum tax exceeds regular income tax.
// IRC §55(a); Form 6251 Line 11 → Schedule 2 Line 1
function computeAmt(netTmt: number, regularTax: number): number {
  return Math.max(0, netTmt - regularTax);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6251Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6251";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: Form6251Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // Part I — AMTI (Line 4)
    const amti = computeAmti(input);

    // Part II — Exemption (Line 5)
    const exemption = computeExemption(amti, input.filing_status);

    // Line 6 — Taxable excess
    const taxableExcess = computeTaxableExcess(amti, exemption);

    // Line 7 — Tentative Minimum Tax
    const tmt = computeTentativeMinimumTax(taxableExcess, input.filing_status);

    // Line 9 — Net TMT after AMTFTC
    const netTmt = computeNetTmt(tmt, input.amtftc ?? 0);

    // Line 11 — AMT liability
    const amt = computeAmt(netTmt, input.regular_tax);

    if (amt === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule2, { line1_amt: amt }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6251 = new Form6251Node();
