import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";

// Part I short-term: A (1099-B basis reported), B (1099-B no basis), C (no 1099-B)
// Part I short-term digital: G (1099-DA basis reported), H (1099-DA no basis), I (no 1099-DA)
// Part II long-term: D (1099-B basis reported), E (1099-B no basis), F (no 1099-B)
// Part II long-term digital: J (1099-DA basis reported), K (1099-DA no basis), L (no 1099-DA)
const SHORT_TERM_PARTS = new Set(["A", "B", "C", "G", "H", "I"]);

// Section 1202 QSBS exclusion codes
// Q1: 50% exclusion (pre-2009 stock), Q2: 75% exclusion (2009-2010), Q3: 100% exclusion (post-2010)
export enum QsbsCode {
  Q1 = "Q1",
  Q2 = "Q2",
  Q3 = "Q3",
}

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
  amt_cost_basis: z.number().nonnegative().optional(),
  qsbs_code: z.nativeEnum(QsbsCode).optional(),
  qsbs_amount: z.number().nonnegative().optional(),
  wash_sale_loss: z.number().nonnegative().optional(),
  loss_not_allowed: z.boolean().optional(),
  state_tax_withheld: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8949s: z.array(itemSchema).min(1),
});

type F8949Item = z.infer<typeof itemSchema>;

function isLongTerm(item: F8949Item): boolean {
  return !SHORT_TERM_PARTS.has(item.part);
}

// Derive adjustment codes incorporating wash_sale_loss (W) and loss_not_allowed (L)
function resolvedAdjustmentCodes(item: F8949Item): string | undefined {
  let codes = item.adjustment_codes ?? "";
  if ((item.wash_sale_loss ?? 0) > 0) {
    codes = codes + "W";
  }
  if (item.loss_not_allowed === true) {
    codes = codes + "L";
  }
  return codes.length > 0 ? codes : undefined;
}

// Derive adjustment amount incorporating auto-generated codes
function resolvedAdjustmentAmount(item: F8949Item): number | undefined {
  if ((item.wash_sale_loss ?? 0) > 0) {
    return item.wash_sale_loss;
  }
  if (item.loss_not_allowed === true) {
    // Zero out the loss: adjustment = cost_basis - proceeds
    return item.cost_basis - item.proceeds;
  }
  return item.adjustment_amount;
}

function computeGainLoss(item: F8949Item): number {
  return item.proceeds - item.cost_basis + (resolvedAdjustmentAmount(item) ?? 0);
}

function processItem(item: F8949Item): NodeOutput[] {
  const adjustmentCodes = resolvedAdjustmentCodes(item);
  const adjustmentAmount = resolvedAdjustmentAmount(item);
  const gainLoss = item.proceeds - item.cost_basis + (adjustmentAmount ?? 0);

  const outputs: NodeOutput[] = [
    output(schedule_d, {
      transaction: {
        part: item.part,
        description: item.description,
        date_acquired: item.date_acquired,
        date_sold: item.date_sold,
        proceeds: item.proceeds,
        cost_basis: item.cost_basis,
        adjustment_codes: adjustmentCodes,
        adjustment_amount: adjustmentAmount,
        gain_loss: gainLoss,
        is_long_term: isLongTerm(item),
        ...(item.qsbs_code ? { qsbs_code: item.qsbs_code, qsbs_amount: item.qsbs_amount } : {}),
      },
    }),
  ];

  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push(output(f1040, { line25b_withheld_1099: item.federal_withheld }));
  }

  if (item.amt_cost_basis !== undefined && item.amt_cost_basis !== item.cost_basis) {
    outputs.push(output(form6251, { other_adjustments: item.amt_cost_basis - item.cost_basis }));
  }

  return outputs;
}

class F8949Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8949";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, f1040, form6251]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f8949s.flatMap((item) => processItem(item)) };
  }
}

export const f8949 = new F8949Node();
