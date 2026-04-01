import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// FinCEN Form 114 — FBAR (Report of Foreign Bank and Financial Accounts)
// Filed separately with FinCEN (NOT with the IRS) by April 15.
// This node is informational only — no tax computation or output routing.
// Threshold: U.S. persons with foreign accounts exceeding $10,000 aggregate at
// any point during the year must file FBAR. (FinCEN Form 114 instructions)

export enum AccountType {
  Bank = "bank",
  Securities = "securities",
  Other = "other",
}

const accountItemSchema = z.object({
  country: z.string().optional(),
  institution_name: z.string().optional(),
  account_type: z.nativeEnum(AccountType),
  max_value: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  has_foreign_accounts: z.boolean(),
  max_aggregate_value: z.number().nonnegative().optional(),
  account_count: z.number().nonnegative().optional(),
  accounts: z.array(accountItemSchema).optional(),
});

class F114Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f114";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // FBAR is informational only — no tax outputs regardless of account values
    return { outputs: [] };
  }
}

export const f114 = new F114Node();
