import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";

// SSA-1042-S and RRB-1042-S are distinct issued copies, not SSA-1099 or
// RRB-1099-R rows. Their tax character and recipient attachment requirements
// need separate review before any amount enters the Form 1040 graph.
export const inputSchema = z.object({
  copies: z.array(
    z.object({
      kind: z.enum(["ssa_1042s", "rrb_1042s"]),
      recipient_tin: z.string().regex(/^\d{9}$/),
      source_document_reference: z.string().trim().min(1),
      reported_gross_benefits: z.number().nonnegative(),
      reported_federal_withholding: z.number().nonnegative(),
      resident_refund_claim_requested: z.boolean().optional(),
    }).strict(),
  ).min(1),
}).strict().refine(
  ({ copies }) =>
    new Set(copies.map((copy) => copy.source_document_reference)).size ===
      copies.length,
  { message: "SSA/RRB-1042-S copies need distinct issued references" },
);

class Benefit1042sNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "benefit_1042s";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const benefit_1042s = new Benefit1042sNode();
