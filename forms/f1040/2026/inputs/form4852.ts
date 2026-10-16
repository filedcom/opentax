import { TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import {
  calculateForm4852Bridge2026,
  type Form4852Bridge2026,
  form4852Bridge2026Schema,
} from "./form4852-bridge.ts";
class Form4852Node2026 extends TaxNode<typeof form4852Bridge2026Schema> {
  readonly nodeType = "f4852";
  readonly inputSchema = form4852Bridge2026Schema;
  readonly outputNodes = new OutputNodes([]);
  compute(ctx: NodeContext, input: Form4852Bridge2026) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("Form 4852 requires f1040:2026 context");
    }
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: { calculation_2026: calculateForm4852Bridge2026(input) },
      }],
    };
  }
}
export const form4852_2026 = new Form4852Node2026();
