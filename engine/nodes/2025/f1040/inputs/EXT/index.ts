import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  extension_filed: z.boolean().optional(),
  amount_paid_with_extension: z.number().nonnegative().optional(),
});

type EXTInput = z.infer<typeof inputSchema>;

class EXTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ext";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["f1040"] as const;

  compute(input: EXTInput): NodeResult {
    const outputs: NodeOutput[] = [];

    if (
      input.amount_paid_with_extension !== undefined &&
      input.amount_paid_with_extension > 0
    ) {
      outputs.push({
        nodeType: "f1040",
        input: { line38_amount_paid_extension: input.amount_paid_with_extension },
      });
    }

    return { outputs };
  }
}

export const ext = new EXTNode();
