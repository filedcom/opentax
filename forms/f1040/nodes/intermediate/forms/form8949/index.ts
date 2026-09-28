import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { rate_28_gain_worksheet } from "../../worksheets/rate_28_gain_worksheet/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

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
  source_transaction_id: z.string().trim().min(1).optional(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  gain_loss: z.number(),
  is_long_term: z.boolean(),
  // Collectibles flag (IRC §1(h)(5)) — gain is taxable at 28% max rate.
  // Set when the upstream 1099-B box 3 transaction is classified as collectibles.
  collectibles: z.boolean().optional(),
  qsbs_code: z.enum(["Q1", "Q2", "Q3"]).optional(),
  qsbs_amount: z.number().nonnegative().optional(),
  from_form4797_investment_1245: z.literal(true).optional(),
  form4797_property_id: z.string().trim().min(1).optional(),
});

// Executor accumulation pattern: the engine merges repeated NodeOutputs targeting
// the same key, so `transaction` arrives as either a single object or an array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1)]);

export const inputSchema = z.object({
  // Individual transactions deposited by upstream nodes (f1099b, etc.)
  transaction: accumulable(transactionSchema).optional(),
  // Flat transaction fields (alternative to nested transaction object)
  part: z.nativeEnum(Form8949Part).optional(),
  description: z.string().optional(),
  source_transaction_id: z.string().trim().min(1).optional(),
  date_acquired: z.string().optional(),
  date_sold: z.string().optional(),
  proceeds: z.number().nonnegative().optional(),
  cost_basis: z.number().nonnegative().optional(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  gain_loss: z.number().optional(),
  is_long_term: z.boolean().optional(),
  collectibles: z.boolean().optional(),
  qsbs_code: z.enum(["Q1", "Q2", "Q3"]).optional(),
  qsbs_amount: z.number().nonnegative().optional(),
});

type Form8949Input = z.infer<typeof inputSchema>;
type Transaction = z.infer<typeof transactionSchema>;

export function assertForm8949TransactionMath(
  tx: Pick<Transaction, "proceeds" | "cost_basis" | "adjustment_amount" | "gain_loss">,
): void {
  const expected = tx.proceeds - tx.cost_basis + (tx.adjustment_amount ?? 0);
  if (!Number.isFinite(expected) || Math.abs(tx.gain_loss - expected) > 0.000001) {
    throw new Error(
      "Form 8949 gain or loss does not reconcile to proceeds, basis, and column (g)",
    );
  }
}

export function assertForm4797ExcessGainRow(
  tx: z.infer<typeof transactionSchema>,
): void {
  if (!tx.from_form4797_investment_1245) return;
  if (
    tx.part !== Form8949Part.F || !tx.is_long_term ||
    tx.description !== "From Form 4797" ||
    !tx.source_transaction_id || !tx.form4797_property_id ||
    tx.date_acquired !== "" || tx.date_sold !== "" ||
    tx.cost_basis !== 0 || tx.proceeds <= 0 ||
    tx.adjustment_codes !== undefined ||
    tx.adjustment_amount !== undefined || tx.gain_loss !== tx.proceeds ||
    tx.collectibles !== undefined || tx.qsbs_code !== undefined ||
    tx.qsbs_amount !== undefined
  ) {
    throw new Error(
      "Form 8949 excess gain from Form 4797 needs the sourced Part II box F row with blank dates, basis, and adjustments",
    );
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeTransactions(
  transaction: Form8949Input["transaction"],
): Transaction[] {
  if (transaction === undefined) return [];
  return Array.isArray(transaction) ? transaction : [transaction];
}

function flatFieldsToTransaction(input: Form8949Input): Transaction[] {
  if (
    input.part !== undefined &&
    input.description !== undefined &&
    input.date_acquired !== undefined &&
    input.date_sold !== undefined &&
    input.proceeds !== undefined &&
    input.cost_basis !== undefined &&
    input.gain_loss !== undefined &&
    input.is_long_term !== undefined
  ) {
    return [{
      part: input.part,
      description: input.description,
      source_transaction_id: input.source_transaction_id,
      date_acquired: input.date_acquired,
      date_sold: input.date_sold,
      proceeds: input.proceeds,
      cost_basis: input.cost_basis,
      adjustment_codes: input.adjustment_codes,
      adjustment_amount: input.adjustment_amount,
      gain_loss: input.gain_loss,
      is_long_term: input.is_long_term,
      collectibles: input.collectibles,
      qsbs_code: input.qsbs_code,
      qsbs_amount: input.qsbs_amount,
    }];
  }
  return [];
}

function hasTransactions(input: Form8949Input): boolean {
  return normalizeTransactions(input.transaction).length > 0 ||
    flatFieldsToTransaction(input).length > 0;
}

// Routes a single transaction to schedule_d via the `transaction` accumulation key.
function routeTransaction(tx: Transaction): NodeOutput {
  return output(schedule_d, { transaction: tx });
}

// Routes long-term collectibles gains to the 28% Rate Gain Worksheet.
// Only positive gains are routed (losses don't affect the 28% rate gain worksheet).
function collectiblesGainOutputs(transactions: Transaction[]): NodeOutput[] {
  const total = transactions
    .filter((tx) =>
      tx.collectibles === true && tx.is_long_term && tx.gain_loss > 0
    )
    .reduce((sum, tx) => sum + tx.gain_loss, 0);
  if (total <= 0) return [];
  return [
    output(rate_28_gain_worksheet, { collectibles_gain_from_8949: total }),
  ];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8949IntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8949";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, rate_28_gain_worksheet]);

  compute(_ctx: NodeContext, rawInput: Form8949Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasTransactions(input)) {
      return { outputs: [] };
    }

    const transactions = [
      ...normalizeTransactions(input.transaction),
      ...flatFieldsToTransaction(input),
    ];
    if (
      transactions.some((tx) =>
        tx.qsbs_code !== undefined || tx.qsbs_amount !== undefined ||
        tx.adjustment_codes?.includes("Q")
      )
    ) {
      throw new Error(
        "Form 8949 section 1202 gain needs a sourced exclusion, Schedule D 28% rate refigure, and Form 6251 line 2h preference before filing",
      );
    }
    for (const transaction of transactions) {
      assertForm4797ExcessGainRow(transaction);
      assertForm8949TransactionMath(transaction);
    }
    return {
      outputs: [
        ...transactions.map(routeTransaction),
        ...collectiblesGainOutputs(transactions),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8949 = new Form8949IntermediateNode();
