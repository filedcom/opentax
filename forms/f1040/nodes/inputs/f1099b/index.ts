import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8949, type Form8949Part } from "../../intermediate/form8949/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

const LONG_TERM_PARTS = new Set(["D", "E", "F"]);

export const itemSchema = z.object({
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

export const inputSchema = z.object({
  f1099bs: z.array(itemSchema).min(1),
});

type B99Item = z.infer<typeof itemSchema>;

function processItem(item: B99Item): NodeOutput[] {
  const gainLoss = item.proceeds - item.cost_basis + (item.adjustment_amount ?? 0);
  const isLongTerm = LONG_TERM_PARTS.has(item.part);
  const outputs: NodeOutput[] = [
    output(form8949, {
      part: item.part as Form8949Part,
      description: item.description,
      date_acquired: item.date_acquired,
      date_sold: item.date_sold,
      proceeds: item.proceeds,
      cost_basis: item.cost_basis,
      adjustment_codes: item.adjustment_codes,
      adjustment_amount: item.adjustment_amount,
      gain_loss: gainLoss,
      is_long_term: isLongTerm,
    }),
  ];
  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push(output(f1040, { line25b_withheld_1099: item.federal_withheld! }));
  }
  return outputs;
}

class F1099bNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8949, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f1099bs.flatMap(processItem) };
  }
}

export const f1099b = new F1099bNode();
