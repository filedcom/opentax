import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 970 — Application to Use LIFO Inventory Method
// Administrative/election form filed under IRC §472.
// No tax computation — records the LIFO inventory election for a business.
// No downstream outputs produced.

export enum InventoryMethodBefore {
  Cost = "cost",
  LowerCostOrMarket = "lower_cost_market",
  Retail = "retail",
  Other = "other",
}

// Per-item schema — one Form 970 per business entity
export const itemSchema = z.object({
  // Name of the business making the LIFO election
  business_name: z.string().min(1),
  // Employer Identification Number of the business
  employer_id: z.string().min(1),
  // Tax year in which LIFO is first elected
  first_year_lifo_elected: z.number().int(),
  // Inventory method used before LIFO election
  inventory_method_before: z.nativeEnum(InventoryMethodBefore),
  // Description of goods to which LIFO applies (optional)
  goods_to_which_lifo_applies: z.string().optional(),
  // Dollar value of inventory at start of first LIFO year (optional)
  book_value_first_year: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f970s: z.array(itemSchema).min(1),
});

type F970Items = z.infer<typeof itemSchema>[];

// Returns empty — form 970 produces no downstream outputs
function buildOutputs(_items: F970Items): [] {
  return [];
}

class F970Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f970";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f970s) };
  }
}

export const f970 = new F970Node();
