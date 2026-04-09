import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";

// Per-person schema — one entry per insured (taxpayer + spouse each enter separately)
export const itemSchema = z.object({
  // Age of insured as of December 31, 2025 — determines age bracket
  age: z.number().int().min(0).max(130),
  // Annual premium paid for the qualified LTC contract
  actual_premium_paid: z.number().nonnegative(),
  // Whether the contract qualifies under IRC §7702B
  is_qualified_contract: z.boolean(),
});

export const inputSchema = z.object({
  ltc_premiums: z.array(itemSchema).min(1),
});

type LtcPremiumItem = z.infer<typeof itemSchema>;
type LtcPremiumItems = LtcPremiumItem[];

type LtcPremiumLimits = ReadonlyArray<{ readonly maxAge: number; readonly limit: number }>;

// Compute the age-based dollar limit (Rev. Proc. 2024-40 §3.34)
function ageBracketLimit(age: number, ltcPremiumLimits: LtcPremiumLimits): number {
  for (const bracket of ltcPremiumLimits) {
    if (age <= bracket.maxAge) return bracket.limit;
  }
  return ltcPremiumLimits[ltcPremiumLimits.length - 1].limit;
}

// Eligible premium = min(actual, age_limit) — only for qualified contracts
function eligiblePremium(item: LtcPremiumItem, ltcPremiumLimits: LtcPremiumLimits): number {
  if (item.is_qualified_contract !== true) return 0;
  const limit = ageBracketLimit(item.age, ltcPremiumLimits);
  return Math.min(item.actual_premium_paid, limit);
}

function totalEligiblePremium(items: LtcPremiumItems, ltcPremiumLimits: LtcPremiumLimits): number {
  return items.reduce((sum, item) => sum + eligiblePremium(item, ltcPremiumLimits), 0);
}

function scheduleAOutput(items: LtcPremiumItems, ltcPremiumLimits: LtcPremiumLimits): NodeOutput[] {
  const total = totalEligiblePremium(items, ltcPremiumLimits);
  if (total === 0) return [];
  return [output(scheduleA, { line_1_medical: total })];
}

class LtcPremiumNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ltc_premium";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA]);

  compute(ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);
    return { outputs: scheduleAOutput(parsed.ltc_premiums, cfg.ltcPremiumLimits) };
  }
}

export const ltc_premium = new LtcPremiumNode();
