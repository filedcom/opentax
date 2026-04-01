import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 age-based eligible long-term care insurance premium limits
// IRC §213(d)(10); Rev. Proc. 2024-40 §3.45
const LTC_LIMIT_AGE_40_UNDER = 480;
const LTC_LIMIT_AGE_41_50 = 900;
const LTC_LIMIT_AGE_51_60 = 1800;
const LTC_LIMIT_AGE_61_70 = 4830;
const LTC_LIMIT_AGE_71_OVER = 6020;

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

// Compute the age-based dollar limit for TY2025 (Rev. Proc. 2024-40 §3.45)
function ageBracketLimit(age: number): number {
  if (age <= 40) return LTC_LIMIT_AGE_40_UNDER;
  if (age <= 50) return LTC_LIMIT_AGE_41_50;
  if (age <= 60) return LTC_LIMIT_AGE_51_60;
  if (age <= 70) return LTC_LIMIT_AGE_61_70;
  return LTC_LIMIT_AGE_71_OVER;
}

// Eligible premium = min(actual, age_limit) — only for qualified contracts
function eligiblePremium(item: LtcPremiumItem): number {
  if (item.is_qualified_contract !== true) return 0;
  const limit = ageBracketLimit(item.age);
  return Math.min(item.actual_premium_paid, limit);
}

function totalEligiblePremium(items: LtcPremiumItems): number {
  return items.reduce((sum, item) => sum + eligiblePremium(item), 0);
}

function scheduleAOutput(items: LtcPremiumItems): NodeOutput[] {
  const total = totalEligiblePremium(items);
  if (total === 0) return [];
  return [output(scheduleA, { line_1_medical: total })];
}

class LtcPremiumNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ltc_premium";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: scheduleAOutput(parsed.ltc_premiums) };
  }
}

export const ltc_premium = new LtcPremiumNode();
