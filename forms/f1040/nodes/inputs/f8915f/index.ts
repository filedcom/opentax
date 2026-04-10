import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8915-F: Qualified Disaster Retirement Plan Distributions and Repayments
// Permanent replacement for annual 8915-A through 8915-E forms.
// Allows 3-year income spreading, waives 10% early withdrawal penalty (IRC §72(t)(2)(G)),
// tracks repayments as rollovers, excess repayments generate a credit.
// Rev Proc 2021-30; Notice 2020-50 (COVID); IRC §72(t)(2)(G)

// Maximum qualified disaster distribution per participant — $100,000 (COVID-19)
const MAX_QUALIFIED_DISTRIBUTION = 100_000;

export const itemSchema = z.object({
  // Type of qualified disaster (e.g., "COVID-19", "Hurricane Ida") — informational
  disaster_type: z.string().optional(),
  // Year in which the qualified disaster distribution was taken
  distribution_year: z.number().int().optional(),
  // Total qualified disaster distribution (Part I total)
  total_distribution: z.number().nonnegative().max(MAX_QUALIFIED_DISTRIBUTION).optional(),
  // Amount of distribution included in income in prior year 1 of spreading
  amount_reported_prior_year1: z.number().nonnegative().optional(),
  // Amount of distribution included in income in prior year 2 of spreading
  amount_reported_prior_year2: z.number().nonnegative().optional(),
  // Repayments made to retirement plan during current tax year
  repayments_this_year: z.number().nonnegative().optional(),
  // Elect to include all remaining income in current year (instead of 1/3 spreading)
  elect_full_inclusion: z.boolean().optional(),
  // Whether the distribution was from a Roth IRA — Roth qualified distributions are
  // tax-free (basis already taxed); affects whether the spreading income applies
  is_roth_ira: z.boolean().optional()
    .describe("Distribution was from a Roth IRA (tax-free if qualified; Form 8915-F Part I)"),
  // Total repayments made in prior tax years (not current year) — reduces the
  // remaining income balance to avoid double-counting already-repaid amounts
  repayments_prior_years: z.number().nonnegative().optional()
    .describe("Total repayments made in all prior tax years (Form 8915-F Part II cumulative)"),
});

export const inputSchema = z.object({
  f8915fs: z.array(itemSchema).min(1),
});

type F8915FItem = z.infer<typeof itemSchema>;
type F8915FItems = F8915FItem[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Compute the reportable amount for the current year for one item.
// When is_roth_ira is true, the distribution is from a qualified Roth IRA and
// is tax-free — no income is recognized regardless of spreading or repayments.
// repayments_prior_years reduces the remaining balance so that prior repayments
// already counted in prior years are not double-counted here.
function reportableThisYear(item: F8915FItem): number {
  // Roth IRA qualified distributions are entirely tax-free
  if (item.is_roth_ira === true) return 0;

  const total = item.total_distribution ?? 0;
  const alreadyReported =
    (item.amount_reported_prior_year1 ?? 0) +
    (item.amount_reported_prior_year2 ?? 0);
  const priorRepayments = item.repayments_prior_years ?? 0;
  // Remaining income = total less what was already reported and less prior repayments
  const remaining = Math.max(0, total - alreadyReported - priorRepayments);

  if (item.elect_full_inclusion === true) {
    return remaining;
  }

  // Default: 1/3 spreading — report the lesser of one_third or remaining
  const oneThird = total / 3;
  return Math.min(oneThird, remaining);
}

// Net income after subtracting repayments from reportable amount
function netIncome(item: F8915FItem): number {
  const reportable = reportableThisYear(item);
  const repayments = item.repayments_this_year ?? 0;
  return Math.max(0, reportable - repayments);
}

// Excess repayment credit: amount by which repayments exceed the reportable amount
function excessRepayment(item: F8915FItem): number {
  const reportable = reportableThisYear(item);
  const repayments = item.repayments_this_year ?? 0;
  return Math.max(0, repayments - reportable);
}

// Net schedule1 contribution for one item:
// positive = income, negative = credit from excess repayment
function netSchedule1(item: F8915FItem): number {
  return netIncome(item) - excessRepayment(item);
}

function totalNetSchedule1(items: F8915FItems): number {
  return items.reduce((sum, item) => sum + netSchedule1(item), 0);
}

function schedule1Output(items: F8915FItems): NodeOutput[] {
  const net = totalNetSchedule1(items);
  if (net === 0) return [];
  return [output(schedule1, { line8z_other_income: net })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8915FNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8915f";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f8915fs } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(f8915fs),
    ];

    return { outputs };
  }
}

export const f8915f = new F8915FNode();
