import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8978 — Partner's Additional Reporting Year Tax (IRC §6226)
// Used when a BBA partnership elects out of paying the imputed underpayment
// itself and instead passes adjustments to partners via Form 8986.
// Each partner re-figures their reviewed year tax and pays the additional
// amount in the current year. Routes to Schedule 2 as additional tax.
//
// BBA regime applies to tax years beginning after 12/31/2017.
// Reg. §301.6226-3 governs partner-level computation.

// ─── TY2025 Constants (IRC §6226) ────────────────────────────────────────────

const DEFAULT_TAX_RATE = 0.37; // Top marginal rate per IRC §6226(b)(4)
const MIN_REVIEWED_YEAR = 2018; // BBA effective for years beginning after 12/31/2017

// ─── Input schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Tax year under examination (the year being audited) — must be ≥ 2018
  reviewed_tax_year: z.number().int().min(MIN_REVIEWED_YEAR),
  // Partner's share of positive adjustments from Form 8986 (income increases / deduction decreases)
  // IRC §6226(b)(1); Reg. §301.6226-3(b)
  positive_adjustments_share: z.number().nonnegative().optional(),
  // Partner's share of negative adjustments from Form 8986 (income decreases / deduction increases)
  // IRC §6226(b)(2); Reg. §301.6226-3(c)
  negative_adjustments_share: z.number().nonnegative().optional(),
  // Partner's applicable marginal tax rate; defaults to 37% if omitted (IRC §6226(b)(4))
  partner_tax_rate: z.number().nonnegative().max(1).optional(),
  // Net tax effect from intervening years (tax attribute carryforwards, basis adjustments)
  // Positive = additional tax; negative = tax reduction. IRC §6226(b)(2); Reg. §301.6226-3(e)
  intervening_year_adjustments: z.number().optional(),
});

type F8978Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function effectiveRate(input: F8978Input): number {
  return input.partner_tax_rate ?? DEFAULT_TAX_RATE;
}

function reviewedYearTax(input: F8978Input): number {
  const positiveAdj = input.positive_adjustments_share ?? 0;
  return positiveAdj * effectiveRate(input);
}

function negativeAdjEffect(input: F8978Input): number {
  const negativeAdj = input.negative_adjustments_share ?? 0;
  return negativeAdj * effectiveRate(input);
}

function additionalTax(input: F8978Input): number {
  const base = reviewedYearTax(input);
  const negEffect = negativeAdjEffect(input);
  const intervening = input.intervening_year_adjustments ?? 0;
  return Math.max(0, base - negEffect + intervening);
}

function buildOutputs(tax: number): NodeOutput[] {
  if (tax <= 0) return [];
  return [{ nodeType: schedule2.nodeType, fields: { line17z_other_additional_taxes: tax } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8978Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8978";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const tax = additionalTax(input);
    return { outputs: buildOutputs(tax) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8978 = new F8978Node();
