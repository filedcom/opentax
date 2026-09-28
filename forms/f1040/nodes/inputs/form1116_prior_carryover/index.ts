import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  form_1116,
  priorYearCarryoverSchema,
} from "../../intermediate/forms/form_1116/index.ts";

export const inputSchema = z.object({
  carryovers: z.array(priorYearCarryoverSchema).min(1),
}).strict();

class Form1116PriorCarryoverNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form1116_prior_carryover";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form_1116]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(raw);
    return {
      outputs: [this.outputNodes.output(form_1116, {
        prior_year_carryovers: input.carryovers,
      })],
    };
  }
}

export const form1116_prior_carryover = new Form1116PriorCarryoverNode();
