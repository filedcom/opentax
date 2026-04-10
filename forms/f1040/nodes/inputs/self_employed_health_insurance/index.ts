import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Self-Employed Health Insurance Deduction — Schedule 1 Part II Line 17
//
// Simplified input node for the self-employed health insurance deduction
// (IRC §162(l)). Accepts premiums paid and routes them to Schedule 1 line 17
// and the AGI aggregator.
//
// Deduction limit: cannot exceed net self-employment profit. When the user
// also provides a Schedule C/F/SE, that profit cap is enforced by the
// form7206 intermediate node. This node routes the full premium amount and
// trusts the user has verified it does not exceed SE profit.
//
// For complex scenarios (long-term care premiums, PTC reduction, profit cap),
// use the form7206 node directly with se_net_profit and health_insurance_premiums.

// ── Per-item schema ───────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Total health insurance premiums paid — medical, dental, and vision
  // coverage for the taxpayer, spouse, and dependents
  premiums_paid: z.number().nonnegative(),
});

// ── Input schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  items: z.array(itemSchema).min(1),
});

type SehiInput = z.infer<typeof inputSchema>;

// ── Pure helpers ─────────────────────────────────────────────────────────────

function totalPremiums(input: SehiInput): number {
  return input.items.reduce((sum, item) => sum + item.premiums_paid, 0);
}

function buildOutputs(deduction: number): NodeOutput[] {
  if (deduction <= 0) return [];
  return [
    output(schedule1, { line17_se_health_insurance: deduction }),
    output(agi_aggregator, { line17_se_health_insurance: deduction }),
  ];
}

// ── Node class ────────────────────────────────────────────────────────────────

class SelfEmployedHealthInsuranceNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "self_employed_health_insurance";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: SehiInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const deduction = totalPremiums(input);
    return { outputs: buildOutputs(deduction) };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const self_employed_health_insurance = new SelfEmployedHealthInsuranceNode();
