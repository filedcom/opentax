import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

const LONG_TERM_PARTS = new Set(["D", "E", "F"]);

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

type B99Input = z.infer<typeof inputSchema>;

class B99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "b99";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["form8949", "f1040"] as const;

  compute(input: B99Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const adjustmentAmount = input.adjustment_amount ?? 0;
    const gainLoss = input.proceeds - input.cost_basis + adjustmentAmount;
    const isLongTerm = LONG_TERM_PARTS.has(input.part);

    // Always route to form8949
    outputs.push({
      nodeType: "form8949",
      input: {
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
    });

    // Backup withholding → f1040 line25b
    if (input.federal_withheld !== undefined && input.federal_withheld > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.federal_withheld },
      });
    }

    return { outputs };
  }
}

export const b99 = new B99Node();
