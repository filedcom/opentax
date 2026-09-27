import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { credit_resolution_2026 } from "./credit_resolution.ts";
import { schedule3_2026 } from "./schedule3.ts";

export const f5695Input2026Schema = z.object({
  source_tax_year: z.literal(2025),
  line16_unused_credit: z.number().finite().positive(),
}).strict();

class F5695InputNode2026 extends TaxNode<typeof f5695Input2026Schema> {
  readonly nodeType = "f5695";
  readonly inputSchema = f5695Input2026Schema;
  readonly outputNodes = new OutputNodes([
    schedule3_2026,
    credit_resolution_2026,
  ]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f5695Input2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 5695 source requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    return {
      outputs: [
        this.outputNodes.output(schedule3_2026, {
          form5695_carryforward_pending: true,
        }),
        this.outputNodes.output(credit_resolution_2026, {
          carryforward_from_2025_line16: input.line16_unused_credit,
        }),
        { nodeType: this.nodeType, fields: input },
      ],
    };
  }
}

export const f5695_2026 = new F5695InputNode2026();
