import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../schedule_d/index.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

// Part I: short-term (held ≤ 1 year); Part II: long-term (held > 1 year)
// A/B/C = short-term 1099-B / no 1099-B; D/E/F = long-term equivalents
// G/H/I = short-term digital asset (1099-DA); J/K/L = long-term digital asset
export enum Form8949Part {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  I = "I",
  J = "J",
  K = "K",
  L = "L",
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

// A single Form 8949 transaction row with pre-computed gain_loss and is_long_term.
// gain_loss = proceeds − cost_basis + adjustment_amount (col h = d − e + g).
// is_long_term is derived by the upstream input node (f1099b, f8949) from the part.
export const transactionSchema = z.object({
  part: z.nativeEnum(Form8949Part),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  gain_loss: z.number(),
  is_long_term: z.boolean(),
});

// Executor accumulation pattern: the engine merges repeated NodeOutputs targeting
// the same key, so `transaction` arrives as either a single object or an array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1)]);

export const inputSchema = z.object({
  // Individual transactions deposited by upstream nodes (f1099b, etc.)
  transaction: accumulable(transactionSchema).optional(),
});

type Form8949Input = z.infer<typeof inputSchema>;
type Transaction = z.infer<typeof transactionSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeTransactions(
  transaction: Form8949Input["transaction"],
): Transaction[] {
  if (transaction === undefined) return [];
  return Array.isArray(transaction) ? transaction : [transaction];
}

function hasTransactions(input: Form8949Input): boolean {
  return normalizeTransactions(input.transaction).length > 0;
}

// Routes a single transaction to schedule_d via the `transaction` accumulation key.
function routeTransaction(tx: Transaction): NodeOutput {
  return {
    nodeType: schedule_d.nodeType,
    fields: { transaction: tx },
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8949IntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8949";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d]);

  compute(rawInput: Form8949Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasTransactions(input)) {
      return { outputs: [] };
    }

    const transactions = normalizeTransactions(input.transaction);
    return { outputs: transactions.map(routeTransaction) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8949 = new Form8949IntermediateNode();
