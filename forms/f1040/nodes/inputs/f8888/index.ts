import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Account type for refund deposit
export enum AccountType {
  Checking = "checking",
  Savings = "savings",
}

const accountSchema = z.object({
  routing_number: z.string().regex(/^(0[1-9]|1[0-2]|2[1-9]|3[0-2])\d{7}$/),
  account_number: z.string().regex(/^[A-Za-z0-9-]{1,17}$/),
  account_type: z.nativeEnum(AccountType),
  amount: z.number().int().positive(),
  // Preflight ownership fact. It is not printed on Form 8888.
  owner_name: z.string().trim().min(1),
}).strict();

// Form 8888 — Allocation of Refund
// Metadata only — no tax computation outputs.
// TY2025 refund routing info for direct deposit split (2 or 3 accounts).

export const inputSchema = z.object({
  account_1: accountSchema,
  account_2: accountSchema,
  account_3: accountSchema.optional(),
}).strict().refine((accounts) =>
  new Set(
    [accounts.account_1, accounts.account_2, accounts.account_3]
      .filter((account) => account !== undefined)
      .map((account) => `${account.routing_number}:${account.account_number}`),
  ).size === (accounts.account_3 === undefined ? 2 : 3), {
  message: "Form 8888 requires distinct deposit accounts",
});

class F8888Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8888";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Metadata-only form — no tax computations or outputs
    return { outputs: [] };
  }
}

export const f8888 = new F8888Node();
