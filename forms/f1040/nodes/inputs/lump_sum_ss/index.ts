import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Lump-Sum Social Security Benefits Worksheet
// When a taxpayer receives a lump-sum Social Security payment covering prior years,
// the full reported benefit belongs on Form 1040 line 6a. IRS Pub. 915's
// earlier-year method can lower line 6b only after its worksheets are completed.
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

  // A claimed election cannot be inferred from this flag alone: Worksheet 4
  // needs prior-year income and previously taxed benefit amounts. Retain this
  // input so an asserted election is rejected explicitly during computation.
  is_lump_sum_election_beneficial: z.boolean().optional(),
});

export const inputSchema = z.object({
  lump_sum_sss: z.array(itemSchema).min(1),
});

type LumpSumSSItem = z.infer<typeof itemSchema>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateItem(item: LumpSumSSItem): void {
  if (item.lump_sum_amount > item.total_ss_benefits_this_year) {
    throw new Error(
      `LumpSumSS validation: lump_sum_amount (${item.lump_sum_amount}) cannot exceed ` +
        `total_ss_benefits_this_year (${item.total_ss_benefits_this_year})`,
    );
  }
}

// ─── Node class ───────────────────────────────────────────────────────────────

class LumpSumSSNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "lump_sum_ss";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { lump_sum_sss } = parsed;

    // Validate all items before computing
    for (const item of lump_sum_sss) {
      validateItem(item);
    }
    if (
      lump_sum_sss.some((item) => item.is_lump_sum_election_beneficial === true)
    ) {
      throw new Error(
        "Lump-sum Social Security election needs Publication 915 Worksheet 4 and prior-year tax facts before lines 6b and 6c can be filed",
      );
    }

    // The total already appears in issued SSA-1099/RRB-1099 box 5. Final
    // return preflight matches this worksheet to those copies; depositing it
    // again would double Form 1040 line 6a and taxable-benefit calculations.
    return { outputs: [] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const lump_sum_ss = new LumpSumSSNode();
