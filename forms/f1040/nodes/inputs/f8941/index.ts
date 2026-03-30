import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// ─── TY2025 Constants (IRC §45R — Small Employer Health Insurance Credit) ─────

// Maximum credit: 50% of premiums for for-profit; 35% for tax-exempt
const MAX_RATE_FOR_PROFIT = 0.50;
const MAX_RATE_TAX_EXEMPT = 0.35;

// FTE threshold: ≤25 FTEs to qualify; phase-out between 10 and 25
const MAX_FTE = 25;
const PHASE_OUT_FTE_START = 10;
const PHASE_OUT_FTE_RANGE = MAX_FTE - PHASE_OUT_FTE_START; // 15

// Average wage threshold (TY2025): $56,000; phase-out $28,000 – $56,000
const MAX_AVG_WAGE = 56_000;
const PHASE_OUT_WAGE_START = 28_000;
const PHASE_OUT_WAGE_RANGE = MAX_AVG_WAGE - PHASE_OUT_WAGE_START; // 28,000

export const inputSchema = z.object({
  // Full-time equivalent employee count (may be fractional)
  fte_count: z.number().nonnegative(),
  // Average annual wages per FTE
  average_annual_wages: z.number().nonnegative(),
  // Total health insurance premiums paid by employer (limited to uniform amount)
  premiums_paid: z.number().nonnegative(),
  // Whether employer enrolled through SHOP marketplace
  shop_enrollment: z.boolean().optional(),
  // Whether the employer is a tax-exempt organization
  is_tax_exempt: z.boolean().optional(),
});

type F8941Input = z.infer<typeof inputSchema>;

// Phase-out reduction fraction due to FTE count (above 10)
function ftePhaseOutReduction(fte: number): number {
  if (fte <= PHASE_OUT_FTE_START) return 0;
  if (fte >= MAX_FTE) return 1;
  return (fte - PHASE_OUT_FTE_START) / PHASE_OUT_FTE_RANGE;
}

// Phase-out reduction fraction due to average wages (above $28k)
function wagePhaseOutReduction(avgWage: number): number {
  if (avgWage <= PHASE_OUT_WAGE_START) return 0;
  if (avgWage >= MAX_AVG_WAGE) return 1;
  return (avgWage - PHASE_OUT_WAGE_START) / PHASE_OUT_WAGE_RANGE;
}

function computeCredit(input: F8941Input): number {
  // Must have ≤25 FTEs and avg wages ≤$56,000 to receive any credit
  if (input.fte_count >= MAX_FTE) return 0;
  if (input.average_annual_wages >= MAX_AVG_WAGE) return 0;

  // SHOP requirement (for tax years after 2013)
  if (input.shop_enrollment === false) return 0;

  const rate = input.is_tax_exempt === true ? MAX_RATE_TAX_EXEMPT : MAX_RATE_FOR_PROFIT;
  const baseCredit = input.premiums_paid * rate;

  // Apply combined phase-out: subtract each reduction fraction from 1
  const fteReduction = ftePhaseOutReduction(input.fte_count);
  const wageReduction = wagePhaseOutReduction(input.average_annual_wages);

  // Combined multiplier: (1 - fteReduction) × (1 - wageReduction)
  const multiplier = (1 - fteReduction) * (1 - wageReduction);
  return baseCredit * multiplier;
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8941Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8941";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F8941Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = computeCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8941 = new F8941Node();
