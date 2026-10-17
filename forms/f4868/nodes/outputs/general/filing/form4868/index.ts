import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

/** Form 4868 Part II as filed, lines 4 through 9. */
export const inputSchema = z.object({
  line4_total_tax_liability: z.number().nonnegative(),
  line5_total_payments: z.number().nonnegative(),
  line6_balance_due: z.number().nonnegative(),
  line7_amount_paying: z.number().nonnegative(),
  line8_out_of_country: z.boolean(),
  line9_1040nr_no_wages_withheld: z.boolean(),
});

export type Form4868Lines = z.infer<typeof inputSchema>;

class Form4868Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4868";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, _input: Form4868Lines): NodeResult {
    return { outputs: [] };
  }
}

export const form4868 = new Form4868Node();
