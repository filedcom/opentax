import { TaxNode } from "../../../core/types/tax-node.ts";
import type { NodeResult } from "../../../core/types/tax-node.ts";
import { z } from "zod";

const inputSchema = z.object({
  w2s: z.array(z.object({ box1: z.number() })).optional(),
});

export class StartNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["w2"] as const;

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const w2s = input.w2s ?? [];
    return {
      outputs: w2s.map((w2) => ({
        nodeType: "w2" as const,
        input: { w2 },
      })),
    };
  }
}
