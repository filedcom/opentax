import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Alimony Received Input Node
//
// Handles alimony received under divorce or separation instruments executed
// before January 1, 2019. Such amounts are taxable to the recipient under
// IRC §71 (pre-TCJA rules apply based on instrument date).
//
// Amounts reported on Schedule 1, Line 2a.
// Post-2018 instruments: alimony is NOT taxable — do not use this node for those.

// ─── Schema ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Alimony amount received during the tax year
  amount: z.number().nonnegative(),
  // Date of the divorce or separation agreement (ISO date YYYY-MM-DD)
  // Must be before 2019-01-01 for pre-TCJA taxability
  divorce_agreement_date: z.string().optional(),
  // Payer's SSN (required on return per IRC §215(c) to claim deduction on payer's side)
  payer_ssn: z.string().optional(),
});

export const inputSchema = z.object({
  alimony_receiveds: z.array(itemSchema),
});

type AlimonyItems = z.infer<typeof itemSchema>[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Only pre-2019 instrument dates are taxable to the recipient.
// If divorce_agreement_date is absent, we assume pre-2019 (taxable) by default,
// since the node itself represents pre-2019 alimony per the schema docs.
function isTaxable(item: z.infer<typeof itemSchema>): boolean {
  if (!item.divorce_agreement_date) return true;
  return item.divorce_agreement_date < "2019-01-01";
}

function totalTaxableAlimony(items: AlimonyItems): number {
  return items
    .filter(isTaxable)
    .reduce((sum, item) => sum + item.amount, 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class AlimonyReceivedNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "alimony_received";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const taxable = totalTaxableAlimony(input.alimony_receiveds);

    if (taxable <= 0) {
      return { outputs: [] };
    }

    return {
      outputs: [
        this.outputNodes.output(schedule1, {
          line2a_alimony_received: taxable,
        }),
        this.outputNodes.output(agi_aggregator, {
          line2a_alimony_received: taxable,
        }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const alimony_received = new AlimonyReceivedNode();
