import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";

// An amendment is a separate filing for the affected tax year. Preserve an
// entered intent without applying the correction to the original TY2025 graph.
export const inputSchema = z.object({
  requests: z.array(
    z.object({
      affected_tax_year: z.number().int().positive().max(2025),
      correction_summary: z.string().trim().min(1),
      request_reference: z.string().trim().min(1),
      prior_return_reference: z.string().trim().min(1),
      request_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
}).strict().refine(
  ({ requests }) =>
    new Set(requests.map((request) => request.affected_tax_year)).size ===
      requests.length &&
    new Set(requests.map((request) => request.request_reference)).size ===
      requests.length,
  { message: "Amendment requests need distinct years and references" },
);

class AmendmentRequestNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "amendment_request";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const amendment_request = new AmendmentRequestNode();
