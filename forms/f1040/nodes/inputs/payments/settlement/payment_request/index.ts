import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}, "Payment request needs a real calendar date");

// These are requests, never evidence of a payment already made or authority
// to debit an account. A separate payment workflow must review and authorize
// the selected IRS payment root before transmission.
export const inputSchema = z.object({
  requests: z.array(
    z.object({
      kind: z.enum([
        "current_return_balance_due",
        "future_estimated_tax",
        "section965_installment",
        "qualified_farmland_installment",
      ]),
      amount: z.number().int().positive(),
      tax_year: z.number().int().min(2025),
      requested_payment_date: dateSchema,
      request_reference: z.string().trim().min(1),
      request_confirmed: z.literal(true),
    }).strict(),
  ).min(1).max(20),
}).strict().refine(
  ({ requests }) =>
    new Set(requests.map((request) => request.request_reference)).size ===
      requests.length,
  { message: "Payment requests need distinct request references" },
);

class PaymentRequestNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "payment_request";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const payment_request = new PaymentRequestNode();
