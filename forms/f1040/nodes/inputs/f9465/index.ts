import { z } from "zod";
import type {
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 9465 — Installment Agreement Request
// Administrative form only — does not generate tax amounts.
// No output nodes required.

export const inputSchema = z.object({
  // Amount owed (balance due on return)
  amount_owed: z.number().nonnegative().optional(),
  // Proposed monthly payment amount
  monthly_payment: z.number().nonnegative().optional(),
  // Proposed payment due day (1–28)
  payment_day: z.number().int().min(1).max(28).optional(),
  // Bank routing number for direct debit
  bank_routing_number: z.string().optional(),
  // Bank account number for direct debit
  bank_account_number: z.string().optional(),
  // Direct debit (true) vs. check payment (false)
  direct_debit: z.boolean().optional(),
  // Prior installment agreement (affects user fee)
  prior_installment_agreement: z.boolean().optional(),
  // Low-income taxpayer (reduced user fee)
  low_income: z.boolean().optional(),
});

class F9465Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f9465";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Administrative form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f9465 = new F9465Node();
