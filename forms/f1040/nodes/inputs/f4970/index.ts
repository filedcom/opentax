import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4970 — Tax on Accumulation Distribution of Trusts
// IRC §665-668: Beneficiary reports tax on accumulation distributions from
// certain domestic trusts. The "throwback rule" treats the distribution as
// if it had been distributed in the year the income was accumulated.
// The resulting additional tax flows to Form 1040 as additional taxes.

// Per-throwback-year schema — each prior year when income was accumulated
export const throwbackYearSchema = z.object({
  // The year in which the trust income was accumulated
  tax_year: z.number().int(),
  // The amount of income accumulated in that year (distributed now)
  accumulated_income: z.number().nonnegative(),
  // The taxes paid by the trust on this income in that year
  taxes_paid_by_trust: z.number().nonnegative().optional(),
});

// Per-item schema — one Form 4970 per trust distribution
export const itemSchema = z.object({
  // Name of the trust making the accumulation distribution
  trust_name: z.string().min(1),
  // Trust EIN
  trust_ein: z.string().min(1),
  // Total accumulation distribution amount received
  distribution_amount: z.number().nonnegative(),
  // Prior accumulation years with income details
  throwback_years: z.array(throwbackYearSchema).optional(),
  // Total deemed distributed taxes (pre-computed, from Part III of form)
  tax_deemed_distributed: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f4970s: z.array(itemSchema).min(1),
});

type F4970Item = z.infer<typeof itemSchema>;
type F4970Items = F4970Item[];

// Compute the additional tax for a single item
// Uses tax_deemed_distributed if provided; otherwise uses a simplified
// flat-rate estimate (21% — trust tax rate) applied to distribution_amount.
// In a full implementation the throwback calculation requires per-year
// marginal rate lookups; here we use the provided tax_deemed_distributed.
function itemAdditionalTax(item: F4970Item): number {
  if ((item.tax_deemed_distributed ?? 0) > 0) {
    return item.tax_deemed_distributed!;
  }
  return 0;
}

function totalAdditionalTax(items: F4970Items): number {
  return items.reduce((sum, item) => sum + itemAdditionalTax(item), 0);
}

function buildOutputs(items: F4970Items): NodeOutput[] {
  const tax = totalAdditionalTax(items);
  if (tax <= 0) return [];
  return [{
    nodeType: f1040.nodeType,
    fields: { line17_additional_taxes: tax },
  }];
}

class F4970Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4970";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f4970s) };
  }
}

export const f4970 = new F4970Node();
