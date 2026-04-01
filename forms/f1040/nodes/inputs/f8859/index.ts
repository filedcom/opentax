import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8859 — Carryforward of the DC First-Time Homebuyer Credit (IRC §1400C).
// The credit itself expired after December 31, 2011. For TY2025, no new credit
// can be generated. Unused credit from prior years carries forward indefinitely
// and is applied as a nonrefundable credit against current-year tax liability.
// Routes to Schedule 3 (nonrefundable credits → Form 1040 line 20).

export const itemSchema = z.object({
  // Unused DC first-time homebuyer credit from prior year(s), per Form 8859 Line 4
  carryforward_amount: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8859s: z.array(itemSchema).min(1),
});

type F8859Items = z.infer<typeof itemSchema>[];

function totalCarryforward(items: F8859Items): number {
  return items.reduce((sum, item) => sum + (item.carryforward_amount ?? 0), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8859Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8859";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const credit = totalCarryforward(parsed.f8859s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8859 = new F8859Node();
