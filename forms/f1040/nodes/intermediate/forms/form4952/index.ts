import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

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
  gross_investment_income: z.number().nonnegative().optional(),
  qualified_dividends: z.number().nonnegative().optional(),
  investment_net_gain: z.number().nonnegative().optional(),
  investment_net_capital_gain: z.number().nonnegative().optional(),
  elected_qualified_dividends: z.number().nonnegative().optional(),
  elected_net_capital_gain: z.number().nonnegative().optional(),
  investment_expenses: z.number().nonnegative().optional(),
  investment_income: z.number().nonnegative().optional(),

  // Prior-year investment interest expense carryforward (Form 4952 line 2).
  // IRC §163(d)(2)
  prior_year_carryforward: z.number().nonnegative().optional(),
});

type Form4952Input = z.infer<typeof inputSchema>;

export function calculateInvestmentInterest(
  expense: number,
  netInvestmentIncome: number,
  priorYearCarryforward: number,
): { allowed: number; carryforward: number } {
  const total = expense + priorYearCarryforward;
  const allowed = Math.min(total, Math.max(0, netInvestmentIncome));
  return { allowed, carryforward: total - allowed };
}

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

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4952Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4952";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form4952Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const total = totalInterest(input);
    if (total === 0) {
      return { outputs: [] };
    }

    const nii = netInvestmentIncome(input);
    const { allowed, carryforward } = calculateInvestmentInterest(
      input.investment_interest_expense ?? 0,
      nii,
      input.prior_year_carryforward ?? 0,
    );

    return {
      outputs: [{ nodeType: this.nodeType, fields: {
        investment_interest_expense: input.investment_interest_expense ?? 0,
        prior_year_carryforward: input.prior_year_carryforward ?? 0,
        total_investment_interest: total,
        gross_investment_income: input.gross_investment_income ?? 0,
        qualified_dividends: input.qualified_dividends ?? 0,
        nonqualified_investment_income: (input.gross_investment_income ?? 0) - (input.qualified_dividends ?? 0),
        investment_net_gain: input.investment_net_gain ?? 0,
        investment_net_capital_gain: input.investment_net_capital_gain ?? 0,
        noncapital_investment_gain: (input.investment_net_gain ?? 0) - (input.investment_net_capital_gain ?? 0),
        elected_investment_income: (input.elected_qualified_dividends ?? 0) + (input.elected_net_capital_gain ?? 0),
        investment_income: input.investment_income ?? nii + (input.investment_expenses ?? 0),
        investment_expenses: input.investment_expenses ?? 0,
        net_investment_income: nii,
        allowed_interest: allowed,
        disallowed_interest_carryforward: carryforward,
      } }],
      ...(carryforward > 0 ? { carryforwards: { investment_interest_excess_4952: carryforward } } : {}),
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4952 = new Form4952Node();
