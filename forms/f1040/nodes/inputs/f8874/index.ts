import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// Form 8874 — New Markets Credit (IRC §45D)
// 7-year credit period: 5% for years 1–3, 6% for years 4–7 (total 39%).
// Credit = qualified equity investment × applicable percentage for that year.
// Routes to Schedule 3, Line 6z (general business credit).

// TY2025 constants — IRC §45D(a)(2)
const RATE_YEARS_1_TO_3 = 0.05;   // 5% — credit years 1, 2, 3
const RATE_YEARS_4_TO_7 = 0.06;   // 6% — credit years 4, 5, 6, 7

export const inputSchema = z.object({
  // Qualified equity investments × applicable rate for years 1–3 (5%)
  // Represents the total of (investment × 5%) already computed or from prior Form 8874
  credit_years_1_to_3: z.number().nonnegative().optional(),
  // Qualified equity investments × applicable rate for years 4–7 (6%)
  credit_years_4_to_7: z.number().nonnegative().optional(),
  // Alternative: provide raw investment amounts and year in credit period
  // investment_amount_early: QEI in years 1-3 of their credit period
  investment_amount_early: z.number().nonnegative().optional(),
  // investment_amount_later: QEI in years 4-7 of their credit period
  investment_amount_later: z.number().nonnegative().optional(),
  // Prior-year carryforward of unused New Markets Credit
  prior_year_carryforward: z.number().nonnegative().optional(),
});

type F8874Input = z.infer<typeof inputSchema>;

function computeCurrentYearCredit(input: F8874Input): number {
  // If pre-computed credit amounts provided, use them directly
  const directEarly = input.credit_years_1_to_3 ?? 0;
  const directLater = input.credit_years_4_to_7 ?? 0;

  // If raw investment amounts provided, apply statutory rates
  const computedEarly = (input.investment_amount_early ?? 0) * RATE_YEARS_1_TO_3;
  const computedLater = (input.investment_amount_later ?? 0) * RATE_YEARS_4_TO_7;

  return directEarly + directLater + computedEarly + computedLater;
}

function totalCredit(input: F8874Input): number {
  return computeCurrentYearCredit(input) + (input.prior_year_carryforward ?? 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8874Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8874";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F8874Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8874 = new F8874Node();
