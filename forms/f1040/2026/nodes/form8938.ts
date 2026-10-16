import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import {
  calculateForeignAssetReturn2026,
  foreignAssetReturnInput2026Schema,
} from "../inputs/foreign-assets-return.ts";

class Form8938Node2026
  extends TaxNode<typeof foreignAssetReturnInput2026Schema> {
  readonly nodeType = "f8938";
  readonly inputSchema = foreignAssetReturnInput2026Schema;
  readonly outputNodes = new OutputNodes([]);
  compute(
    ctx: NodeContext,
    raw: z.input<typeof foreignAssetReturnInput2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 8938 source binding needs f1040:2026 context");
    }
    const calculation = calculateForeignAssetReturn2026(raw);
    return {
      outputs: calculation
        ? [{
          nodeType: this.nodeType,
          fields: { calculation_2026: calculation },
        }]
        : [],
    };
  }
}
export const form8938_2026 = new Form8938Node2026();
