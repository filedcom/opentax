import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  calculateSchedule8812Lines,
  inputSchema as sharedInputSchema,
} from "../../nodes/inputs/f8812/index.ts";
import { f1040_2026_node } from "./f1040.ts";

export const f8812Input2026Schema = sharedInputSchema.extend({
  auto_schedule2_line3: z.number().finite().nonnegative().optional(),
});

/** Calculate 2026 child credits after AGI, income tax, and Schedule 2. */
class F8812Node2026 extends TaxNode<typeof f8812Input2026Schema> {
  readonly nodeType = "f8812";
  readonly inputSchema = f8812Input2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof f8812Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule 8812 requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    const creditCounts = (input.auto_qualifying_children ?? 0) +
      (input.auto_other_dependents ?? 0);
    if (creditCounts === 0) return { outputs: [] };
    if (input.auto_income_tax_liability === undefined) {
      throw new Error(
        "TY2026 Schedule 8812 needs calculated Form 1040 line 16 tax",
      );
    }
    const lines = calculateSchedule8812Lines(2026, {
      ...input,
      auto_income_tax_liability: input.auto_income_tax_liability +
        (input.auto_schedule2_line3 ?? 0),
    });
    return {
      outputs: [
        this.outputNodes.output(f1040_2026_node, {
          schedule8812_finalized: true,
          line19_child_tax_credit: lines?.line14 ?? 0,
          line28_actc: lines?.line27 ?? 0,
        }),
        {
          nodeType: this.nodeType,
          fields: {
            ...lines,
            line14: lines?.line14 ?? 0,
            line27: lines?.line27 ?? 0,
            qualifying_children_count: input.auto_qualifying_children ?? 0,
            other_dependents_count: input.auto_other_dependents ?? 0,
          },
        },
      ],
    };
  }
}

export const f8812_2026 = new F8812Node2026();
