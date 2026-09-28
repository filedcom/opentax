import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// The existing item has no disaster declaration/FEMA identity, distribution
// type or prior-year Form 8915-F reconciliation. Retain its fields only to
// reject a populated TY2025 source until those facts and the correct Form
// 1040 retirement-income lines can be filed. For 2021-and-later qualified
// disasters, the IRS limit is $22,000 per disaster, not the former universal
// $100,000 COVID-19 cap.
export const itemSchema = z.object({
  disaster_type: z.string().optional(),
  distribution_year: z.number().int().optional(),
  total_distribution: z.number().nonnegative().optional(),
  amount_reported_prior_year1: z.number().nonnegative().optional(),
  amount_reported_prior_year2: z.number().nonnegative().optional(),
  repayments_this_year: z.number().nonnegative().optional(),
  elect_full_inclusion: z.boolean().optional(),
  is_roth_ira: z.boolean().optional(),
  repayments_prior_years: z.number().nonnegative().optional(),
}).strict();

export const inputSchema = z.object({
  f8915fs: z.array(itemSchema).optional(),
}).strict();

class F8915FNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8915f";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if ((input.f8915fs?.length ?? 0) > 0) {
      throw new Error(
        "TY2025 Form 8915-F needs disaster-year/source and prior-return reconciliation before retirement income or repayments can be filed",
      );
    }
    return { outputs: [] };
  }
}

export const f8915f = new F8915FNode();
