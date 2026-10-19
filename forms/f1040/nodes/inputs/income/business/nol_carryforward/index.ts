import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { itemSchema, NolType } from "./calculation.ts";

// Prior-year NOL carryforwards. The AGI aggregator figures the Schedule 1
// line 8a deduction from the return (IRC §172(a); Pub. 536); a keyed
// current_year_taxable_income (taxable income before the NOL and QBI
// deductions) overrides the return's figure.

export { itemSchema, NolType };

// ── Schemas ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  nol_carryforwards: z.array(itemSchema).min(1),
  current_year_taxable_income: z.number().optional(),
});

// ── Node class ────────────────────────────────────────────────────────────────

class NolCarryforwardNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "nol_carryforward";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const items = parsed.nol_carryforwards.filter((item) =>
      item.nol_amount > 0
    );
    if (items.length === 0) return { outputs: [] };
    return {
      outputs: [this.outputNodes.output(agi_aggregator, {
        nol_carryforwards: items,
        ...(parsed.current_year_taxable_income !== undefined && {
          nol_taxable_income_override: parsed.current_year_taxable_income,
        }),
      })],
    };
  }
}

export const nol_carryforward = new NolCarryforwardNode();
