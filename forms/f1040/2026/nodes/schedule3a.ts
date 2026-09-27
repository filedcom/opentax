import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";

const amount = z.number().finite().nonnegative();

/** Draft Schedule 3-A (2026), Parts I–II. */
export const inputSchema = z.object({
  line1a_refundable_credits: amount,
  line1b_other_payments: amount,
  line2_eligible_refundable_credits: amount,
  line3_total_tax: amount,
  line4_schedule2_line20: amount,
  line5_tax_offset: amount,
  line6_federal_public_benefit: amount,
  line7_wants_benefit: z.boolean().optional(),
  line8_eligible: z.boolean().optional(),
  line8_disallowed_benefit: amount.optional(),
}).strict();

class Schedule3aNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] };
  }
}

export const schedule3a = new Schedule3aNode();
