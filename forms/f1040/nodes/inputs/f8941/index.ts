import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 Form 8941's wage phaseout starts at $33,000 and ends at $67,000
// per FTE, not the prior hardcoded $28,000/$56,000. The simplified input
// cannot establish the two-year credit period, SHOP coverage, rating-area
// premium limit, controlled-group FTEs, or Form 3800 tax-use limitation.
// Keep its current fields only to reject an active claim until that native
// source-to-filed-document route exists.
export const inputSchema = z.object({
  fte_count: z.number().nonnegative(),
  average_annual_wages: z.number().nonnegative(),
  premiums_paid: z.number().nonnegative(),
  shop_enrollment: z.boolean().optional(),
  is_tax_exempt: z.boolean().optional(),
}).strict();

type F8941Input = z.infer<typeof inputSchema>;

class F8941Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8941";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8941Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.premiums_paid > 0) {
      throw new Error(
        "TY2025 Form 8941 credit needs verified SHOP and credit-period facts, a native Form 8941, and Form 3800 limitation before Schedule 3",
      );
    }
    return { outputs: [] };
  }
}

export const f8941 = new F8941Node();
