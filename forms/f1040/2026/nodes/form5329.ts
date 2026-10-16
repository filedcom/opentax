import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateForm5329Sources2026,
  form5329Source2026Schema,
} from "../inputs/form5329-source.ts";
class Form5329Node2026 extends TaxNode<typeof form5329Source2026Schema> {
  readonly nodeType = "form5329";
  readonly inputSchema = form5329Source2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule2", "form1062"];
  }
  compute(
    ctx: NodeContext,
    raw: z.input<typeof form5329Source2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("Form 5329 needs f1040:2026 context");
    }
    const r = calculateForm5329Sources2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "schedule2",
          fields: {
            line5_form5329_early_tax: r.schedule2_line5,
            line18_form5329_excess_tax: r.schedule2_line18,
          },
        },
        ...(r.source_input.retirement_sources_2026 ||
            r.source_input.able_sources_2026 || r.source_input.hsa_sources_2026
          ? [{ nodeType: "form1062", fields: { form5329: r.source_input } }]
          : []),
      ],
    };
  }
}
export const form5329_2026 = new Form5329Node2026();
