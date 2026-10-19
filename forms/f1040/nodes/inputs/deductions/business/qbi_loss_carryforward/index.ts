import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { form8995 } from "../../../../intermediate/forms/deductions/business/form8995/index.ts";

// Prior-year section 199A loss carryforwards.
//
// i8995 (2025), Line 3: "Enter on line 3 your qualified business net (loss)
// carryforward from the prior year. This is the amount from your prior year
// Form 8995, line 16, or Form 8995-A, line 39."
// i8995 (2025), Line 7: the qualified REIT dividends and qualified PTP (loss)
// carryforward from the prior year Form 8995, line 17, or Form 8995-A, line 40.
// Both are entered here as positive loss amounts; Form 8995 shows them in
// parentheses on lines 3 and 7.

export const inputSchema = z.object({
  qbi_loss_carryforward: z.number().positive().optional(),
  reit_ptp_loss_carryforward: z.number().positive().optional(),
}).strict();

type QbiLossCarryforwardInput = z.infer<typeof inputSchema>;

class QbiLossCarryforwardNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qbi_loss_carryforward";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8995]);

  compute(_ctx: NodeContext, raw: QbiLossCarryforwardInput): NodeResult {
    const input = inputSchema.parse(raw);
    const qbi = input.qbi_loss_carryforward;
    const reit = input.reit_ptp_loss_carryforward;
    if (qbi === undefined && reit === undefined) return { outputs: [] };
    return {
      outputs: [this.outputNodes.output(
        form8995,
        qbi === undefined
          ? { reit_loss_carryforward: -reit! }
          : {
            qbi_loss_carryforward: -qbi,
            ...(reit !== undefined && { reit_loss_carryforward: -reit }),
          },
      )],
    };
  }
}

export const qbi_loss_carryforward = new QbiLossCarryforwardNode();
