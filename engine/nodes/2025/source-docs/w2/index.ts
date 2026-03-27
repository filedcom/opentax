import { TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { z } from "zod";

const inputSchema = z.object({
  w2: z.object({ box1: z.number() }),
});

export class W2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["line_01z_wages"] as const;

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return {
      outputs: [
        {
          nodeType: "line_01z_wages" as const,
          input: { wages: [input.w2.box1] },
        },
      ],
    };
  }
}
