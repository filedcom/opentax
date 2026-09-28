import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Premiums alone cannot establish the business-earnings deduction limit.
// Positive claims need the identified Form 7206 source route.

// ── Per-item schema ───────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Total health insurance premiums paid — medical, dental, and vision
  // coverage for the taxpayer, spouse, and dependents
  premiums_paid: z.number().nonnegative(),
});

// ── Input schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  items: z.array(itemSchema).min(1),
  marketplace_ptc_premium_overlap: z.boolean(),
}).strict();

type SehiInput = z.infer<typeof inputSchema>;

// ── Node class ────────────────────────────────────────────────────────────────

class SelfEmployedHealthInsuranceNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "self_employed_health_insurance";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: SehiInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.marketplace_ptc_premium_overlap) {
      throw new Error(
        "Self-employed health insurance Marketplace PTC overlap requires Publication 974 deduction calculation",
      );
    }
    if (input.items.some((item) => item.premiums_paid > 0)) {
      throw new Error(
        "Self-employed health insurance needs an identified Form 7206 plan and business earnings calculation",
      );
    }
    return { outputs: [] };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const self_employed_health_insurance =
  new SelfEmployedHealthInsuranceNode();
