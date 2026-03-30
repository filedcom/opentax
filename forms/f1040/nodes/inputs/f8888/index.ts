import { z } from "zod";
import type {
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Account type for refund deposit
export enum AccountType {
  Checking = "checking",
  Savings = "savings",
}

const accountSchema = z.object({
  routing_number: z.string().optional(),
  account_number: z.string().optional(),
  account_type: z.nativeEnum(AccountType).optional(),
  amount: z.number().nonnegative().optional(),
});

// Form 8888 — Allocation of Refund
// Metadata only — no tax computation outputs.
// Refund routing info for direct deposit split (up to 3 accounts + savings bonds).

export const inputSchema = z.object({
  account_1: accountSchema.optional(),
  account_2: accountSchema.optional(),
  account_3: accountSchema.optional(),
  // Amount to purchase savings bonds (Form 8888 Part II)
  savings_bond_amount: z.number().nonnegative().optional(),
  // Bond owner first name
  bond_owner_name: z.string().optional(),
  // Co-owner or beneficiary name
  bond_coowner_name: z.string().optional(),
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
