import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8828 — Recapture of Federal Mortgage Subsidy
// IRC §143(m): When a home financed with a federally subsidized mortgage (tax-exempt
// bond) is sold within 9 years, a portion of the subsidy must be repaid if MAGI
// exceeded the repayment income limit. Recapture flows to Schedule 2 line 10.

// TY2025 Constants
const SUBSIDY_FACTOR = 0.0625; // 6.25% per IRC §143(m)(2)
const MAX_INCOME_PCT = 0.50; // 50% cap per IRC §143(m)(3)
const GAIN_RECAPTURE_CAP_RATE = 0.50; // 50% of gain per IRC §143(m)(5)

// Holding period percentage table per IRC §143(m)(4)
const HOLDING_PERIOD_TABLE: Record<number, number> = {
  1: 0.20,
  2: 0.40,
  3: 0.60,
  4: 0.80,
  5: 1.00,
  6: 0.80,
  7: 0.60,
  8: 0.40,
  9: 0.20,
};

export const itemSchema = z.object({
  // Original federally subsidized mortgage loan amount
  original_loan_amount: z.number().nonnegative(),
  // Federally subsidized interest rate benefit (decimal, e.g. 0.06 for 6%)
  subsidy_rate: z.number().nonnegative(),
  // Number of complete years home was held (1-9+); ≥10 → no recapture
  holding_period_years: z.number().nonnegative(),
  // Realized gain on the sale
  gain_on_sale: z.number().nonnegative(),
  // Modified adjusted gross income
  modified_agi: z.number().nonnegative(),
  // Repayment income limit from bond issuer (per IRC §143(f) / HUD tables)
  repayment_income_limit: z.number().nonnegative(),
  // Family size (informational; repayment_income_limit already reflects family size)
  family_size: z.number().optional(),
});

export const inputSchema = z.object({
  f8828s: z.array(itemSchema).min(1),
});

type F8828Item = z.infer<typeof itemSchema>;

// Federally subsidized amount per IRC §143(m)(2): loan × rate × 6.25%
function federallySubsidizedAmount(item: F8828Item): number {
  return item.original_loan_amount * item.subsidy_rate * SUBSIDY_FACTOR;
}

// Holding period percentage per IRC §143(m)(4) table
function holdingPeriodPct(years: number): number {
  const rounded = Math.floor(years);
  return HOLDING_PERIOD_TABLE[rounded] ?? 0;
}

// Income percentage per IRC §143(m)(3): (MAGI / limit - 1) × 100%, capped at 50%
// Source: Form 8828 instructions line 10; IRC §143(m)(3)
function incomePct(magi: number, limit: number): number {
  if (limit <= 0) return 0;
  if (magi <= limit) return 0;
  const raw = (magi / limit) - 1;
  return Math.min(raw, MAX_INCOME_PCT);
}

// Recapture tax for one Form 8828 per IRC §143(m)
function recaptureForItem(item: F8828Item): number {
  const holdingPct = holdingPeriodPct(item.holding_period_years);
  if (holdingPct === 0) return 0;

  const subsidyAmt = federallySubsidizedAmount(item);
  const adjustedRecapture = subsidyAmt * holdingPct;

  const incPct = incomePct(item.modified_agi, item.repayment_income_limit);
  if (incPct === 0) return 0;

  const gainCap = item.gain_on_sale * GAIN_RECAPTURE_CAP_RATE;
  if (gainCap === 0) return 0;

  return Math.min(adjustedRecapture * incPct, gainCap);
}

function buildOutputs(recapture: number): NodeOutput[] {
  if (recapture <= 0) return [];
  return [{ nodeType: schedule2.nodeType, fields: { line10_recapture_tax: recapture } }];
}

class F8828Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8828";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const totalRecapture = input.f8828s.reduce(
      (sum, item) => sum + recaptureForItem(item),
      0,
    );
    return { outputs: buildOutputs(totalRecapture) };
  }
}

export const f8828 = new F8828Node();
