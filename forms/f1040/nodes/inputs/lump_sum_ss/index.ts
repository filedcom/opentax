import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Lump-Sum Social Security Benefits Worksheet
// When a taxpayer receives a lump-sum Social Security payment covering prior years,
// they may use the lump-sum election (IRS Pub 915 "earlier year method") to reduce
// current-year taxable benefits by treating prior-year portions as received in those years.
// The adjusted SS benefit flows to Form 1040 Line 6a.
// IRS Pub 915; IRC §86

// ─── Schemas ──────────────────────────────────────────────────────────────────

const priorYearBenefitSchema = z.object({
  // Tax year the benefits were attributable to
  year: z.number().int().nonnegative(),
  // Amount of lump sum attributable to that year
  amount: z.number().nonnegative(),
});

export const itemSchema = z.object({
  // Box 5 of all SSA-1099/RRB-1099 forms — total net benefits this year including lump sum
  // IRS Pub 915 Worksheet 1 Line 1
  total_ss_benefits_this_year: z.number().nonnegative(),

  // Total lump-sum payment received for prior year(s) — included in box 5 total
  // IRS Pub 915 Worksheet 4
  lump_sum_amount: z.number().nonnegative(),

  // Prior-year benefit amounts by year — for multi-year lump-sum allocations
  // IRS Pub 915 Worksheets 2 and 3 (earlier year method)
  prior_year_benefits: z.array(priorYearBenefitSchema).optional(),

  // Whether the lump-sum election (earlier year method) is beneficial and should be applied
  // If not provided, defaults to false (conservative: include all in current year)
  // Must be explicitly set to true to trigger the election
  is_lump_sum_election_beneficial: z.boolean().optional(),
});

export const inputSchema = z.object({
  lump_sum_sss: z.array(itemSchema).min(1),
});

type LumpSumSSItem = z.infer<typeof itemSchema>;
type LumpSumSSItems = LumpSumSSItem[];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateItem(item: LumpSumSSItem): void {
  if (item.lump_sum_amount > item.total_ss_benefits_this_year) {
    throw new Error(
      `LumpSumSS validation: lump_sum_amount (${item.lump_sum_amount}) cannot exceed ` +
      `total_ss_benefits_this_year (${item.total_ss_benefits_this_year})`,
    );
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Adjusted SS benefits for one item:
// - If election is beneficial: exclude lump sum from current year (prior-year allocation)
// - Otherwise: include full total (all treated in current year)
function adjustedBenefits(item: LumpSumSSItem): number {
  if (item.is_lump_sum_election_beneficial === true) {
    // Lump sum allocated to prior years; only current-year portion taxed now
    return item.total_ss_benefits_this_year - item.lump_sum_amount;
  }
  // Default: include all benefits in current year
  return item.total_ss_benefits_this_year;
}

function totalAdjustedBenefits(items: LumpSumSSItems): number {
  return items.reduce((sum, item) => sum + adjustedBenefits(item), 0);
}

function f1040Output(items: LumpSumSSItems): NodeOutput[] {
  const total = totalAdjustedBenefits(items);
  if (total === 0) return [];
  return [output(f1040, { line6a_ss_gross: total } as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>)];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class LumpSumSSNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "lump_sum_ss";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { lump_sum_sss } = parsed;

    // Validate all items before computing
    for (const item of lump_sum_sss) {
      validateItem(item);
    }

    const outputs: NodeOutput[] = f1040Output(lump_sum_sss);
    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const lump_sum_ss = new LumpSumSSNode();
