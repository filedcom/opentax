import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-building schema — one entry per Form 8609 / BIN
// annual_credit_amount is the key figure: credit_percentage × qualified_basis,
// as determined on Form 8609 line 1b or Form 8609-A line 4.
export const itemSchema = z.object({
  // Required: annual housing credit dollar amount for this building (IRC §42)
  annual_credit_amount: z.number().nonnegative(),

  // Optional informational fields
  // Building Identification Number assigned by the housing credit agency
  building_id: z.string().optional(),
  // Applicable credit percentage (typically 4% or 9%)
  credit_percentage: z.number().nonnegative().optional(),
  // Qualified basis of the building
  qualified_basis: z.number().nonnegative().optional(),
});

// Node inputSchema — all Form 8609 buildings for this return as an array
export const inputSchema = z.object({
  f8609s: z.array(itemSchema).min(1),
});

type F8609Item = z.infer<typeof itemSchema>;

// Sum annual credit amounts across all buildings
function totalCredit(items: F8609Item[]): number {
  return items.reduce((sum, item) => sum + item.annual_credit_amount, 0);
}

// Route total to schedule3 line6b_low_income_housing_credit
function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6b_low_income_housing_credit: credit } }];
}

class F8609Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8609";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f8609s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8609 = new F8609Node();
