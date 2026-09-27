import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8859 — Carryforward of the DC First-Time Homebuyer Credit (IRC §1400C).
// The credit itself expired after December 31, 2011. For TY2025, no new credit
// can be generated. The carryforward is only a source amount. Form 1040
// finalizes line 3 after all credits listed ahead of it in the tax-liability
// worksheet have been determined.

export const itemSchema = z.object({
  // Unused DC first-time homebuyer credit from prior year(s), per Form 8859 Line 4
  carryforward_amount: z.number().finite().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8859s: z.array(itemSchema).min(1),
});

type F8859Items = z.infer<typeof itemSchema>[];

export function totalCarryforward(items: F8859Items): number {
  return items.reduce((sum, item) => sum + (item.carryforward_amount ?? 0), 0);
}

class F8859Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8859";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const source = totalCarryforward(parsed.f8859s);
    if (source <= 0) return { outputs: [] };
    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule3, {
        form8859_source_credit_pending: true,
      }),
      this.outputNodes.output(f1040, {
        form8859_source_carryforward: source,
      }),
    ];
    return { outputs };
  }
}

export const f8859 = new F8859Node();
