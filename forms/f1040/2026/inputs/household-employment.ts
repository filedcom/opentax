import type { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  calculateHousehold2026,
  householdClaim2026Schema,
} from "./household-source.ts";
export const inputSchema = investmentOwner2026.extend(
  householdClaim2026Schema.partial().shape,
).strict();
class Household2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "household_employment";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule2"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Household employment needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const calculation = calculateHousehold2026({
      ...input,
      claim: input.claim,
    });
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: { calculation_2026: calculation },
      }, {
        nodeType: "schedule2",
        fields: { line17a_household_employment_tax: calculation.total_tax },
      }],
    };
  }
}
export const household_employment_2026 = new Household2026();
