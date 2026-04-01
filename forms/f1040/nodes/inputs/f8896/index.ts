import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8896 — Low Sulfur Diesel Fuel Production Credit (IRC §45H)
// Credit for small business refiners producing ultra-low sulfur diesel (ULSD)
// with sulfur content ≤ 15 parts per million.
//
// TY2025 NOTE: This credit is effectively expired. Qualified capital costs had to
// be incurred by December 31, 2009 (IRC §45H). The node is retained for carryforward
// tracing and legacy returns. Rev. Proc. 2007-69.

// ─── TY2025 Constants (IRC §45H) ─────────────────────────────────────────────

const CREDIT_RATE_PER_GALLON = 0.05; // 5 cents per gallon (IRC §45H(a))
const MAX_REFINERY_CAPACITY_BARRELS = 205_000; // bbl/day threshold for "small business refiner" (IRC §45H(c)(1)(A))
const CAPITAL_COSTS_CAP_RATE = 0.25; // 25% of qualified capital costs (IRC §45H(b)(1))

// ─── Per-item schema ──────────────────────────────────────────────────────────

// One entry per refinery/facility
export const itemSchema = z.object({
  // Line 1 — Gallons of qualified ULSD produced (IRC §45H(a))
  gallons_ulsd_produced: z.number().nonnegative().optional(),
  // Line 2 — Qualified capital costs incurred for EPA compliance (IRC §45H(b)(1))
  qualified_capital_costs: z.number().nonnegative().optional(),
  // Average daily domestic refinery run; must be ≤ 205,000 bbl/day (IRC §45H(c)(1)(A))
  refinery_capacity_barrels_per_day: z.number().nonnegative().optional(),
  // Line 3 — Sum of §45H credits claimed in all prior taxable years (IRC §45H(b)(1))
  prior_year_credits_claimed: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8896s: z.array(itemSchema).min(1),
});

type F8896Item = z.infer<typeof itemSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function validateCapacity(item: F8896Item): void {
  const capacity = item.refinery_capacity_barrels_per_day;
  if (capacity !== undefined && capacity > MAX_REFINERY_CAPACITY_BARRELS) {
    throw new Error(
      `Refinery capacity ${capacity} bbl/day exceeds maximum ${MAX_REFINERY_CAPACITY_BARRELS} bbl/day for small business refiner eligibility (IRC §45H(c)(1)(A))`,
    );
  }
}

function baseCredit(item: F8896Item): number {
  return (item.gallons_ulsd_produced ?? 0) * CREDIT_RATE_PER_GALLON;
}

function capitalCostsCap(item: F8896Item): number | null {
  if (item.qualified_capital_costs === undefined) return null;
  const grossCap = item.qualified_capital_costs * CAPITAL_COSTS_CAP_RATE;
  const priorCredits = item.prior_year_credits_claimed ?? 0;
  return Math.max(0, grossCap - priorCredits);
}

function itemCredit(item: F8896Item): number {
  const base = baseCredit(item);
  if (base === 0) return 0;
  const cap = capitalCostsCap(item);
  if (cap === null) return base;
  return Math.min(base, cap);
}

function totalCredit(items: F8896Item[]): number {
  return items.reduce((sum, item) => sum + itemCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8896Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8896";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    for (const item of input.f8896s) {
      validateCapacity(item);
    }
    const credit = totalCredit(input.f8896s);
    return { outputs: buildOutputs(credit) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8896 = new F8896Node();
