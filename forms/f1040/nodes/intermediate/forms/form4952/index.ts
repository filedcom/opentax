import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../../inputs/schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 4952 — Investment Interest Expense Deduction
// IRC §163(d); TY2025 instructions.
//
// The deduction for investment interest expense is limited to net investment
// income. Any excess (disallowed) investment interest carries forward to the
// next tax year.

export const inputSchema = z.object({
  // Investment interest expense paid or accrued during the year.
  // Form 4952 line 1 — includes margin interest, interest on loans to purchase
  // investment property, etc.
  // IRC §163(d)(3)(A)
  investment_interest_expense: z.number().nonnegative().optional(),

  // Net investment income — the ceiling on the deductible amount.
  // Includes taxable interest, ordinary dividends, short-term capital gains,
  // and any long-term capital gains / qualified dividends the taxpayer elects
  // to treat as investment income (Form 4952 line 4g election).
  // IRC §163(d)(4)
  net_investment_income: z.number().nonnegative().optional(),

  // Prior-year investment interest expense carryforward (Form 4952 line 2).
  // IRC §163(d)(2)
  prior_year_carryforward: z.number().nonnegative().optional(),
});

type Form4952Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Total investment interest for the year (current + carryforward).
// Form 4952 line 3.
function totalInterest(input: Form4952Input): number {
  return (input.investment_interest_expense ?? 0) +
    (input.prior_year_carryforward ?? 0);
}

// Net investment income available as the deduction ceiling.
// Form 4952 line 4g / line 5.
function netInvestmentIncome(input: Form4952Input): number {
  return input.net_investment_income ?? 0;
}

// Deductible investment interest: lesser of total interest or net investment income.
// Form 4952 line 6.
// IRC §163(d)(1)
function deductibleInterest(total: number, nii: number): number {
  return Math.min(total, nii);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4952Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4952";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA]);

  compute(_ctx: NodeContext, rawInput: Form4952Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const total = totalInterest(input);
    if (total === 0) {
      return { outputs: [] };
    }

    const nii = netInvestmentIncome(input);
    const deductible = deductibleInterest(total, nii);

    if (deductible === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      output(scheduleA, { line_9_investment_interest: deductible }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4952 = new Form4952Node();
