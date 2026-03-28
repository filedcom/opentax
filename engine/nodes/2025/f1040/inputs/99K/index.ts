import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
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
    const outputs: NodeOutput[] = input.k99s
      .filter((item) => (item.box4_federal_withheld ?? 0) > 0)
      .map((item) => ({ nodeType: f1040.nodeType, input: { line25b_withheld_1099: item.box4_federal_withheld } }));
    return { outputs };
  }
}

export const k99 = new K99Node();
