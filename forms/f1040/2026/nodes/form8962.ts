import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateMarketplaceReturn2026,
  marketplaceReturnInput2026Schema,
} from "../inputs/marketplace-return.ts";
const inputSchema = marketplaceReturnInput2026Schema.partial().strict();
class Form8962Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8962";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule3_final", "schedule2", "form6251", "schedule_a"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 8962 needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.marketplace_sources_2026) return { outputs: [] };
    const result = calculateMarketplaceReturn2026(
      marketplaceReturnInput2026Schema.parse(input),
    );
    const calculation = result.calculation;
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { ...calculation.fields, calculation_2026: result },
        },
        { nodeType: "schedule3_final", fields: calculation.schedule3 },
        { nodeType: "schedule2", fields: calculation.schedule2 },
        {
          nodeType: "form6251",
          fields: { marketplace_reconciliation_2026: result.source_input },
        },
        {
          nodeType: "schedule_a",
          fields: { marketplace_reconciliation_2026: result.source_input },
        },
      ],
    };
  }
}
export const form8962_2026 = new Form8962Node2026();
