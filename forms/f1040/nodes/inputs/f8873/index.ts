import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8873: Extraterritorial Income Exclusion
// IRC §114 was repealed by the American Jobs Creation Act of 2004 (AJCA 2004, P.L. 108-357)
// effective for transactions after 2006. For TY2025, extremely limited applicability remains
// under transition relief for binding contracts entered before September 17, 2003.
// The exclusion reduces taxable income — flows to Schedule 1 Line 8 as negative income.

// Per-item schema — each Form 8873 covers one transaction/exclusion
export const itemSchema = z.object({
  // Qualifying foreign trade income — basis for exclusion computation (Form 8873 line 52)
  qualifying_foreign_trade_income: z.number().nonnegative(),
  // Amount of extraterritorial income excluded from gross income (Form 8873 line 53; IRC §114(a))
  extraterritorial_income_excluded: z.number().nonnegative(),
});

export const inputSchema = z.object({
  f8873s: z.array(itemSchema).min(1),
});

type F8873Item = z.infer<typeof itemSchema>;
type F8873Items = F8873Item[];

function totalExclusion(items: F8873Items): number {
  return items.reduce((sum, item) => sum + item.extraterritorial_income_excluded, 0);
}

function schedule1Output(items: F8873Items): NodeOutput[] {
  const exclusion = totalExclusion(items);
  if (exclusion === 0) return [];
  // Exclusion reduces income — flows as a negative amount to Schedule 1 Line 8 (other income)
  return [output(schedule1, { line8z_other: -exclusion })];
}

class F8873Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8873";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f8873s } = parsed;

    return { outputs: schedule1Output(f8873s) };
  }
}

export const f8873 = new F8873Node();
