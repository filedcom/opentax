import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8866 — Interest Computation Under the Look-Back Method
// for Property Depreciated Under the Income Forecast Method (IRC §167(g))
//
// After the 3rd and 10th tax year following the year property was placed in
// service, the taxpayer recomputes depreciation using actual income versus
// forecasted income. If depreciation was over-claimed → interest owed to IRS
// (additional income on Schedule 1). If under-claimed → interest receivable
// (deduction on Schedule 1).

export enum LookbackYear {
  Third = "3rd",
  Tenth = "10th",
}

// Per-item schema — one Form 8866 per property
export const itemSchema = z.object({
  // Description of the property
  property_description: z.string().min(1),
  // Date the property was placed in service
  date_placed_in_service: z.string(),
  // Whether this is the 3rd or 10th year look-back
  lookback_year: z.nativeEnum(LookbackYear),
  // Total forecasted income used for original depreciation computation
  total_income_forecast: z.number().nonnegative().optional(),
  // Actual income earned through the recomputation date
  actual_income: z.number().nonnegative().optional(),
  // Recomputed depreciation based on actual income
  recomputed_depreciation: z.number().nonnegative().optional(),
  // Depreciation previously claimed in prior years
  prior_year_depreciation_claimed: z.number().nonnegative().optional(),
  // Net interest: positive = owed to IRS, negative = receivable from IRS
  interest_owed_or_due: z.number().optional(),
});

export const inputSchema = z.object({
  f8866s: z.array(itemSchema).min(1),
});

type F8866Item = z.infer<typeof itemSchema>;
type F8866Items = F8866Item[];

function totalInterest(items: F8866Items): number {
  return items.reduce((sum, item) => sum + (item.interest_owed_or_due ?? 0), 0);
}

function buildOutputs(items: F8866Items): NodeOutput[] {
  const net = totalInterest(items);
  if (net === 0) return [];

  if (net > 0) {
    // Interest owed to IRS — additional income
    return [{
      nodeType: schedule1.nodeType,
      fields: { line8z_other_income: net },
    }];
  }

  // Interest receivable from IRS — deduction
  return [{
    nodeType: schedule1.nodeType,
    fields: { line8z_other: net },
  }];
}

class F8866Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8866";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f8866s) };
  }
}

export const f8866 = new F8866Node();
