import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

const inputSchema = z.object({
  line1a_wages: z.number().optional(),
  line1i_combat_pay: z.number().optional(),
  line2a_tax_exempt: z.number().optional(),
  line3a_qualified_dividends: z.number().optional(),
  line25a_w2_withheld: z.number().optional(),
  line25b_withheld_1099: z.number().optional(),
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
