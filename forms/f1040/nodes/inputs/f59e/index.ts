import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// Form 1045 AMT / IRC §59(e) — Unamortized AMT Section 59(e) Deduction
// IRC §59(e) allows certain expenditures to be amortized over 10 years instead
// of deducted currently. The unamortized balance from prior-year §59(e) elections
// is an AMT preference item that flows to Form 6251 (other_adjustments).
// Expenditure types: research/experimental (§174), mining exploration (§616/617),
// development (§616), circulation (§173), intangible drilling costs (§263(c)).

export enum ExpenditureType {
  ResearchExperimental = "research_experimental",
  Mining = "mining",
  Development = "development",
  Circulation = "circulation",
  IntangibleDrilling = "intangible_drilling",
}

export const itemSchema = z.object({
  // Type of §59(e) expenditure
  expenditure_type: z.nativeEnum(ExpenditureType),
  // Date amortization period began (YYYY-MM-DD)
  amortization_period_start: z.string(),
  // Original election amount
  original_amount: z.number().nonnegative(),
  // Remaining unamortized balance carried over from prior year
  remaining_unamortized: z.number().nonnegative(),
});

export const inputSchema = z.object({
  f59es: z.array(itemSchema).min(1),
});

type F59eItem = z.infer<typeof itemSchema>;
type F59eItems = F59eItem[];

function totalUnamortized(items: F59eItems): number {
  return items.reduce((sum, item) => sum + item.remaining_unamortized, 0);
}

class F59eNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f59e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form6251]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const total = totalUnamortized(parsed.f59es);
    if (total === 0) return { outputs: [] };
    return {
      outputs: [{
        nodeType: form6251.nodeType,
        fields: { other_adjustments: total },
      }],
    };
  }
}

export const f59e = new F59eNode();
