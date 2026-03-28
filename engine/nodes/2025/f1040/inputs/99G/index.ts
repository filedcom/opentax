import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

export const itemSchema = z.object({
  box_1_unemployment: z.number().nonnegative().optional(),
  box_1_repaid: z.number().nonnegative().optional(),
  box_2_state_refund: z.number().nonnegative().optional(),
  box_2_prior_year_itemized: z.boolean().optional(),
  box_4_federal_withheld: z.number().nonnegative().optional(),
  box_5_rtaa: z.number().nonnegative().optional(),
  box_6_taxable_grants: z.number().nonnegative().optional(),
  box_7_agriculture: z.number().nonnegative().optional(),
  box_9_market_gain: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  g99s: z.array(itemSchema).min(1),
});

type G99Item = z.infer<typeof itemSchema>;

function g99ItemOutputs(item: G99Item): NodeOutput[] {
  const unemploymentNet = (item.box_1_unemployment ?? 0) - (item.box_1_repaid ?? 0);
  const stateRefund = item.box_2_state_refund ?? 0;
  return [
    ...(unemploymentNet > 0 ? [{ nodeType: schedule1.nodeType, input: { line7_unemployment: unemploymentNet } }] : []),
    ...(item.box_2_prior_year_itemized === true && stateRefund > 0 ? [{ nodeType: schedule1.nodeType, input: { line1_state_refund: stateRefund } }] : []),
    ...((item.box_4_federal_withheld ?? 0) > 0 ? [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: item.box_4_federal_withheld } }] : []),
    ...((item.box_5_rtaa ?? 0) > 0 ? [{ nodeType: schedule1.nodeType, input: { line8z_rtaa: item.box_5_rtaa } }] : []),
    ...((item.box_6_taxable_grants ?? 0) > 0 ? [{ nodeType: schedule1.nodeType, input: { line8z_taxable_grants: item.box_6_taxable_grants } }] : []),
    ...((item.box_7_agriculture ?? 0) > 0 ? [{ nodeType: schedule_f.nodeType, input: { line4a_gov_payments: item.box_7_agriculture } }] : []),
    ...((item.box_9_market_gain ?? 0) > 0 ? [{ nodeType: schedule_f.nodeType, input: { line5_ccc_gain: item.box_9_market_gain } }] : []),
  ];
}

class G99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "g99";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040, schedule_f]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.g99s.flatMap(g99ItemOutputs) };
  }
}

export const g99 = new G99Node();
