import { z } from "zod";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1040_line_1z } from "../../f1040/f1040_line_01z/index.ts";

const inputSchema = z.object({
  box1: z.number(),
});

class W2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [f1040_line_1z.nodeType] as const;

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return {
      outputs: [
        {
          nodeType: f1040_line_1z.nodeType,
          input: { wages: [input.box1] },
        },
      ],
    };
  }
}

export const w2 = new W2Node();
