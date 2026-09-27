import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  carryoverReviewSchema,
  form_1116,
} from "../../intermediate/forms/form_1116/index.ts";

export const inputSchema = z.object({
  reviews: z.array(carryoverReviewSchema).min(1),
}).strict();

class Form1116CarryoverReviewNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form1116_carryover_review";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form_1116]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    const review = inputSchema.parse(raw);
    return {
      outputs: [this.outputNodes.output(form_1116, {
        carryover_reviews: review.reviews,
      })],
    };
  }
}

export const form1116_carryover_review = new Form1116CarryoverReviewNode();
