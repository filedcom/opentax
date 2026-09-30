import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8873: Extraterritorial Income Exclusion
// IRC §114 was repealed by the American Jobs Creation Act of 2004 (AJCA 2004, P.L. 108-357)
// effective for transactions after 2006. For TY2025, extremely limited applicability remains
// under transition relief for binding contracts entered before September 17, 2003.
// Populated TY2025 input remains an unresolved scope decision. Do not invent
// a Schedule 1 line 8z reduction from this sparse historical form input.

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

class F8873Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8873";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    throw new Error(
      "TY2025 Form 8873 has no reviewed current-year filing route; its Schedule 1 line 8z exclusion is unsupported",
    );
  }
}

export const f8873 = new F8873Node();
