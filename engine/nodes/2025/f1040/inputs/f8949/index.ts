import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

// Part I short-term: A (1099-B basis reported), B (1099-B no basis), C (no 1099-B)
// Part I short-term digital: G (1099-DA basis reported), H (1099-DA no basis), I (no 1099-DA)
// Part II long-term: D (1099-B basis reported), E (1099-B no basis), F (no 1099-B)
// Part II long-term digital: J (1099-DA basis reported), K (1099-DA no basis), L (no 1099-DA)
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);

export const itemSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]),
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
  f8949s: z.array(itemSchema).min(1),
});

type F8949Item = z.infer<typeof itemSchema>;

function isLongTerm(item: F8949Item): boolean {
  return !SHORT_TERM_PARTS.has(item.part);
}

function computeGainLoss(item: F8949Item): number {
  return item.proceeds - item.cost_basis + (item.adjustment_amount ?? 0);
}

function processItem(item: F8949Item): NodeOutput[] {
  const gainLoss = computeGainLoss(item);
  const outputs: NodeOutput[] = [
    {
      nodeType: schedule_d.nodeType,
      input: {
        transaction: {
          part: item.part,
          description: item.description,
          date_acquired: item.date_acquired,
          date_sold: item.date_sold,
          proceeds: item.proceeds,
          cost_basis: item.cost_basis,
          adjustment_codes: item.adjustment_codes,
          adjustment_amount: item.adjustment_amount,
          gain_loss: gainLoss,
          is_long_term: isLongTerm(item),
        },
      },
    },
  ];

  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push({
      nodeType: f1040.nodeType,
      input: { line25b_withheld_1099: item.federal_withheld },
    });
  }

  return outputs;
}

class F8949Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8949";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f8949s.flatMap((item) => processItem(item)) };
  }
}

export const f8949 = new F8949Node();
