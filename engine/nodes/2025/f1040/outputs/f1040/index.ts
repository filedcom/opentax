import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

const inputSchema = z.object({
  line1z: z.number().optional(),
});

class F1040Node extends TaxNode<typeof inputSchema> {
  override readonly implemented = false as const;
  readonly nodeType = "f1040";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [] as const;

  compute(): NodeResult {
    throw new Error("Node 'f1040' is not yet implemented.");
  }
}

export const f1040 = new F1040Node();
