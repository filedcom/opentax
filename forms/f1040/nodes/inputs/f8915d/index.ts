import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8915-D: Qualified 2019 Disaster Retirement Plan Distributions and Repayments
// Same structure as Form 8915-F but for qualified 2019 disasters (not COVID-19).
// By TY2025, the 3-year spreading window (2019/2020/2021) is complete.
// Repayments in 2025 may still generate a credit.
// IRC §72(t)(2)(G); Notice 2019-70

// Maximum qualified disaster distribution per participant — $100,000
const MAX_QUALIFIED_DISTRIBUTION = 100_000;

export const itemSchema = z.object({
  // Total qualified 2019 disaster distribution (Form 8915-D Part I)
  total_2019_distribution: z.number().nonnegative().max(MAX_QUALIFIED_DISTRIBUTION).optional(),
  // Amount included in income in TY2019 (first year of spreading)
  amount_previously_reported_2019: z.number().nonnegative().optional(),
  // Amount included in income in TY2020 (second year of spreading)
  amount_previously_reported_2020: z.number().nonnegative().optional(),
  // Amount included in income in TY2021 (third year of spreading)
  amount_previously_reported_2021: z.number().nonnegative().optional(),
  // Repayments made to the retirement plan in 2025
  repayments_in_2025: z.number().nonnegative().optional(),
  // Whether the distribution was from a Roth IRA — Roth qualified distributions are
  // tax-free (basis already taxed); affects whether any remaining income applies
  is_roth_ira: z.boolean().optional()
    .describe("Distribution was from a Roth IRA (tax-free if qualified; Form 8915-D Part I)"),
});

export const inputSchema = z.object({
  f8915ds: z.array(itemSchema).min(1),
});

type F8915DItem = z.infer<typeof itemSchema>;
type F8915DItems = F8915DItem[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function previouslyReported(item: F8915DItem): number {
  return (
    (item.amount_previously_reported_2019 ?? 0) +
    (item.amount_previously_reported_2020 ?? 0) +
    (item.amount_previously_reported_2021 ?? 0)
  );
}

// When is_roth_ira is true, the distribution is from a qualified Roth IRA and
// is tax-free — no income is recognized regardless of repayments or spreading.
function remainingIncome(item: F8915DItem): number {
  if (item.is_roth_ira === true) return 0;
  const total = item.total_2019_distribution ?? 0;
  return Math.max(0, total - previouslyReported(item));
}

function netIncome(item: F8915DItem): number {
  const remaining = remainingIncome(item);
  const repayments = item.repayments_in_2025 ?? 0;
  return Math.max(0, remaining - repayments);
}

function excessRepayment(item: F8915DItem): number {
  const total = item.total_2019_distribution ?? 0;
  // Only generate a credit if there was an actual distribution to repay
  if (total === 0) return 0;
  const remaining = remainingIncome(item);
  const repayments = item.repayments_in_2025 ?? 0;
  return Math.max(0, repayments - remaining);
}

// Net schedule1 contribution: positive = income, negative = credit
function netSchedule1(item: F8915DItem): number {
  return netIncome(item) - excessRepayment(item);
}

function totalNetSchedule1(items: F8915DItems): number {
  return items.reduce((sum, item) => sum + netSchedule1(item), 0);
}

function schedule1Output(items: F8915DItems): NodeOutput[] {
  const net = totalNetSchedule1(items);
  if (net === 0) return [];
  return [output(schedule1, { line8z_other_income: net })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8915DNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8915d";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f8915ds } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(f8915ds),
    ];

    return { outputs };
  }
}

export const f8915d = new F8915DNode();
