import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 5405 — Repayment of the First-Time Homebuyer Credit (IRC §36(f))
// The 2008 first-time homebuyer credit was a $7,500 interest-free loan repaid
// at $500/year over 15 years (TY2010–TY2024). For TY2025, the annual installment
// is still due unless the full balance was previously repaid.
// If the home is sold, disposed of, or destroyed before the period ends,
// the entire remaining balance is accelerated and due in that year.

// Per-instance schema — one Form 5405 per home
export const itemSchema = z.object({
  // Year the credit was originally claimed — must be 2008 (validated in compute)
  credit_year: z.number().int(),
  // Total credit originally received (max $7,500 for 2008)
  original_credit_amount: z.number().nonnegative(),
  // Total repayments made in all prior tax years
  repayments_already_made: z.number().nonnegative(),
  // True if the home was sold, disposed of, or ceased to be the main home in 2025
  sold_or_disposed: z.boolean(),
  // Year of disposal (informational, if applicable)
  disposal_year: z.number().optional(),
  // True if home was destroyed, condemned, or involuntarily converted
  home_destroyed: z.boolean().optional(),
});

export const inputSchema = z.object({
  f5405s: z.array(itemSchema).min(1),
});

type F5405Item = z.infer<typeof itemSchema>;
type F5405Items = F5405Item[];

// TY2025 constants
const ANNUAL_INSTALLMENT = 500; // IRC §36(f)(1)(B): 1/15 of $7,500 max credit

function remainingBalance(item: F5405Item): number {
  return Math.max(0, item.original_credit_amount - item.repayments_already_made);
}

function isAccelerated(item: F5405Item): boolean {
  return item.sold_or_disposed === true || item.home_destroyed === true;
}

function repaymentAmount(item: F5405Item): number {
  const balance = remainingBalance(item);
  if (balance === 0) return 0;
  if (isAccelerated(item)) return balance;
  return Math.min(ANNUAL_INSTALLMENT, balance);
}

function totalRepayment(items: F5405Items): number {
  return items.reduce((sum, item) => sum + repaymentAmount(item), 0);
}

function schedule2Output(items: F5405Items): NodeOutput[] {
  const total = totalRepayment(items);
  if (total === 0) return [];
  return [output(schedule2, { line10_homebuyer_credit_repayment: total })];
}

class F5405Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5405";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f5405s } = parsed;

    for (const item of f5405s) {
      if (item.credit_year !== 2008) {
        throw new Error(
          `Form 5405: credit_year must be 2008 (received ${item.credit_year}). ` +
            "Only the 2008 first-time homebuyer credit requires repayment. " +
            "Credits from 2009 and later were not repayable loans.",
        );
      }
    }

    return { outputs: schedule2Output(f5405s) };
  }
}

export const f5405 = new F5405Node();
