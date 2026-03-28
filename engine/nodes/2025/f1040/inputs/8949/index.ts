import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F"]),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  federal_withheld: z.number().nonnegative().optional(),
});

type F8949Input = z.infer<typeof inputSchema>;

class F8949Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8949";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["schedule_d", "f1040"] as const;

  compute(input: F8949Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const gainLoss =
      input.proceeds - input.cost_basis + (input.adjustment_amount ?? 0);

    const isLongTerm = ["D", "E", "F"].includes(input.part);

    outputs.push({
      nodeType: "schedule_d",
      input: {
        transaction: {
          part: input.part,
          description: input.description,
          date_acquired: input.date_acquired,
          date_sold: input.date_sold,
          proceeds: input.proceeds,
          cost_basis: input.cost_basis,
          adjustment_codes: input.adjustment_codes,
          adjustment_amount: input.adjustment_amount,
          gain_loss: gainLoss,
          is_long_term: isLongTerm,
        },
      },
    });

    if (input.federal_withheld !== undefined && input.federal_withheld > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.federal_withheld },
      });
    }

    return { outputs };
  }
}

export const f8949 = new F8949Node();
