import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8833 — Treaty-Based Return Position Disclosure
// IRC §6114; Reg. §301.6114-1
//
// Required when a taxpayer takes a return position that relies on a US income
// tax treaty to override or modify US domestic tax law. Pure disclosure form —
// no tax computation. $1,000 per-position penalty for failure to disclose
// ($10,000 for corporations). IRC §6712.

// Per-position schema — one Form 8833 per treaty position
export const itemSchema = z.object({
  // The treaty partner country name (Form 8833 line 1a)
  treaty_country: z.string(),
  // The specific treaty article and paragraph relied upon (Form 8833 line 1b)
  treaty_article: z.string(),
  // Description of the treaty-based return position (Form 8833 line 2)
  description_of_position: z.string(),
  // Gross amount of income or gain subject to the treaty position (Form 8833 line 3)
  gross_amount: z.number().nonnegative().optional(),
  // Amount of US tax reduction resulting from the treaty position (Form 8833 line 4)
  amount_of_tax_reduction: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8833s: z.array(itemSchema).min(1),
});

class F8833Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8833";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Form 8833 is a pure disclosure form — no computation, no downstream outputs.
    return { outputs: [] };
  }
}

export const f8833 = new F8833Node();
