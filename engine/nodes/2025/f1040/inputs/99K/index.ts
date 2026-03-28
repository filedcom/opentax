import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  pse_name: z.string(),
  pse_tin: z.string().optional(),
  box1a_gross_payments: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box8_state_withheld: z.number().nonnegative().optional(),
});

type K99Input = z.infer<typeof inputSchema>;

class K99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k99";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["f1040"] as const;

  compute(input: K99Input): NodeResult {
    const outputs: NodeOutput[] = [];

    // box4_federal_withheld > 0 → f1040 line25b
    // All other fields are informational or state-only; no federal routing
    if (input.box4_federal_withheld !== undefined && input.box4_federal_withheld > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.box4_federal_withheld },
      });
    }

    return { outputs };
  }
}

export const k99 = new K99Node();
