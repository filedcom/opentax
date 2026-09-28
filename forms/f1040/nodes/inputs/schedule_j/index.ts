import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// TY2025: base years are 2022 (py1), 2023 (py2), 2024 (py3)
export const inputSchema = z.object({
  // Line 2a — Elected farm income: the amount of current-year taxable farm/fishing
  // income the taxpayer elects to average across the three base years.
  elected_farm_income: z.number().nonnegative(),

  // Line 2b — Portion of elected farm income that is net capital gain from
  // farming or fishing activities (optional; affects rate calculations in worksheets).
  elected_farm_income_capital_gain: z.number().nonnegative().optional(),

  // Line 5 — 2022 taxable income (base year 1).
  prior_year_taxable_income_py1: z.number().nonnegative(),

  // Line 9 — 2023 taxable income (base year 2).
  prior_year_taxable_income_py2: z.number().nonnegative(),

  // Line 13 — 2024 taxable income (base year 3).
  prior_year_taxable_income_py3: z.number().nonnegative(),

  // Line 23 — Schedule J computed tax result. The taxpayer calculates this amount
  // using the IRS multi-year rate worksheets. This value replaces the regular
  // Form 1040 line 16 tax computation when income averaging is elected.
  schedule_j_tax: z.number().nonnegative(),
});

// ─── Type alias ───────────────────────────────────────────────────────────────

type ScheduleJInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns true when the taxpayer has a non-zero elected farm income, meaning
// income averaging actually applies.
function hasElectedFarmIncome(input: ScheduleJInput): boolean {
  return input.elected_farm_income > 0;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleJNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_j";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: ScheduleJInput): NodeResult {
    const parsed = inputSchema.parse(input);

    if (!hasElectedFarmIncome(parsed)) {
      return { outputs: [] };
    }
    throw new Error(
      "Schedule J is not filing-ready: line 23 needs reconciliation to the 2022-2024 base-year tax worksheets before Form 1040 and Form 6251 can be filed",
    );
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_j = new ScheduleJNode();
