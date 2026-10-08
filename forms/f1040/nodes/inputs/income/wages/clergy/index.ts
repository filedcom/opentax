import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

// The existing clergy input does not identify a W-2, employer, minister, or
// advance housing designation. It cannot distinguish compensation already
// excluded from W-2 box 1 from taxable excess, or reconcile Form 4361 approval.
// Preserve the input shape only so an entered claim fails explicitly while a
// source-backed clergy and Schedule SE route is built.
export const itemSchema = z.object({
  ministerial_wages: z.number().nonnegative().optional(),
  housing_allowance_designated: z.number().nonnegative().optional(),
  actual_housing_expenses: z.number().nonnegative().optional(),
  fair_market_rental_value: z.number().nonnegative().optional(),
  parsonage_value: z.number().nonnegative().optional(),
  has_4361_exemption: z.boolean().optional(),
  is_ordained_minister: z.boolean().optional(),
});

export const inputSchema = z.object({
  clergys: z.array(itemSchema).min(1),
});

class ClergyNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "clergy";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    inputSchema.parse(rawInput);
    throw new Error(
      "TY2025 clergy income needs a matched W-2, advance housing designation, taxable-excess review, parsonage/SE base, and Form 4361 evidence before filing",
    );
  }
}

export const clergy = new ClergyNode();
