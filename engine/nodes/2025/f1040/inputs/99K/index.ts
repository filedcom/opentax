import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

export const itemSchema = z.object({
  pse_name: z.string(),
  pse_tin: z.string().optional(),
  box1a_gross_payments: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box8_state_withheld: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  k99s: z.array(itemSchema).min(1),
});

class K99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k99";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.k99s) {
      if (
        item.box4_federal_withheld !== undefined &&
        item.box4_federal_withheld > 0
      ) {
        out.add(f1040, { line25b_withheld_1099: item.box4_federal_withheld });
      }
    }

    return out.build();
  }
}

export const k99 = new K99Node();
