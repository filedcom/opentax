import { z } from "zod";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";

const inputSchema = z.object({
  wages: z.union([z.number(), z.array(z.number())]),
});

class F1040Line1zNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040_line_1z";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [] as const;

  compute(_input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: [] };
  }
}

export const f1040_line_1z = new F1040Line1zNode();
