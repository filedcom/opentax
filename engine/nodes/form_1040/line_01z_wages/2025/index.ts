import { TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { z } from "zod";

const inputSchema = z.object({
  wages: z.union([z.number(), z.array(z.number())]),
});

export class Line01zWagesNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "line_01z_wages";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [] as const;

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const wagesArr = Array.isArray(input.wages) ? input.wages : [input.wages];
    const _total = wagesArr.reduce((sum, w) => sum + w, 0);
    return { outputs: [] };
  }
}
