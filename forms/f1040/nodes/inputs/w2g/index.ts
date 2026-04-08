import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-entry schema — one W-2G from one payer
export const itemSchema = z.object({
  box1_winnings: z.number().nonnegative().optional(),
  box2_type_of_wager: z.string().optional(),
  box3_winnings_identical: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_transaction: z.string().optional(),
  box6_race: z.string().optional(),
  box7_winnings_noncash: z.number().nonnegative().optional(),
  box8_cashier: z.string().optional(),
  box9_winner_tin: z.string().optional(),
  box10_window: z.string().optional(),
  box11_first_id: z.string().optional(),
  box12_second_id: z.string().optional(),
  box13_state: z.string().optional(),
  box14_state_id: z.string().optional(),
  box15_state_withheld: z.number().nonnegative().optional(),
  payer_name: z.string().optional(),
  payer_address: z.string().optional(),
  payer_ein: z.string().optional(),
});

export const inputSchema = z.object({
  w2gs: z.array(itemSchema).min(1),
});

type W2GItem = z.infer<typeof itemSchema>;
type W2GItems = W2GItem[];

function totalWinnings(items: W2GItems): number {
  return items.reduce(
    (sum, item) => sum + (item.box1_winnings ?? 0) + (item.box7_winnings_noncash ?? 0),
    0,
  );
}

function totalFederalWithheld(items: W2GItems): number {
  return items.reduce((sum, item) => sum + (item.box4_federal_withheld ?? 0), 0);
}

function schedule1Output(items: W2GItems): NodeOutput[] {
  const winnings = totalWinnings(items);
  if (winnings === 0) return [];
  return [output(schedule1, { line8z_other_income: winnings })];
}

function f1040Output(items: W2GItems): NodeOutput[] {
  const withheld = totalFederalWithheld(items);
  if (withheld === 0) return [];
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

class W2GNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2g";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { w2gs } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(w2gs),
      ...f1040Output(w2gs),
    ];

    return { outputs };
  }
}

export const w2g = new W2GNode();
