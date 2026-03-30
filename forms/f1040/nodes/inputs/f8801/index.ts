import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // AMT paid in the immediately preceding tax year (prior year Form 6251 result)
  // IRC §53(b)(1)
  prior_year_amt_paid: z.number().nonnegative().optional(),

  // Unused minimum tax credit carried from prior Form 8801 line 26
  // IRC §53(b)(2)
  prior_year_carryforward: z.number().nonnegative().optional(),

  // Regular tax before credits — f1040 line 16 / Schedule 2
  // IRC §53(c)(1)
  current_year_regular_tax: z.number().nonnegative().optional(),

  // Tentative minimum tax from current year Form 6251
  // IRC §53(c)(1)
  current_year_tmt: z.number().nonnegative().optional(),
});

type F8801Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Line 14 — Net minimum tax credit available this year
// IRC §53(b): sum of prior-year AMT paid and carryforward from prior Form 8801
function availableCredit(input: F8801Input): number {
  return (input.prior_year_amt_paid ?? 0) + (input.prior_year_carryforward ?? 0);
}

// IRC §53(c)(1) — limitation: excess of regular tax over tentative minimum tax
function excessRegularOverTmt(input: F8801Input): number {
  return Math.max(0, (input.current_year_regular_tax ?? 0) - (input.current_year_tmt ?? 0));
}

// Line 25 — Credit allowed this year
function creditAllowed(input: F8801Input): number {
  return Math.min(availableCredit(input), excessRegularOverTmt(input));
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8801Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8801";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8801Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const credit = creditAllowed(input);
    if (credit === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule3, { line6e_prior_year_min_tax_credit: credit }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8801 = new F8801Node();
