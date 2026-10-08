import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

// TY2025 — Form 8915-D: Qualified 2019 Disaster Retirement Plan Distributions and Repayments
// Same structure as Form 8915-F but for qualified 2019 disasters (not COVID-19).
// By TY2025, the 3-year spreading window (2019/2020/2021) is complete.
// Any repayment consequence belongs to the affected prior-year return review.
// The current-year filing path remains a named scope decision; the sparse
// input below cannot establish a TY2025 Schedule 1 line 8z amount.

// Maximum qualified disaster distribution per participant — $100,000
const MAX_QUALIFIED_DISTRIBUTION = 100_000;

export const itemSchema = z.object({
  // Total qualified 2019 disaster distribution (Form 8915-D Part I)
  total_2019_distribution: z.number().nonnegative().max(
    MAX_QUALIFIED_DISTRIBUTION,
  ).optional(),
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
    .describe(
      "Distribution was from a Roth IRA (tax-free if qualified; Form 8915-D Part I)",
    ),
});

export const inputSchema = z.object({
  f8915ds: z.array(itemSchema).min(1),
});

// ─── Node class ───────────────────────────────────────────────────────────────

class F8915DNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8915d";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    throw new Error(
      "TY2025 Form 8915-D has no reviewed current-year filing route; its Schedule 1 line 8z income or repayment is unsupported",
    );
  }
}

export const f8915d = new F8915DNode();
