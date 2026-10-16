import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  ableSource2026Schema,
  calculateAbleSources2026,
} from "./able-source.ts";
export const ableClaimInput2026Schema = ableSource2026Schema.pick({
  claim: true,
});
const inputSchema = ableSource2026Schema.partial({ claim: true });
class Able2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "able_accounts";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "schedule1", "form8880", "form5329"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("ABLE sources need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const r = calculateAbleSources2026({ ...input, claim: input.claim });
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "agi_aggregator",
          fields: {
            able_sources_2026: r.source_input,
            line8q_able_taxable_earnings: r.taxable_earnings,
          },
        },
        {
          nodeType: "schedule1",
          fields: { line8q_able_taxable_earnings: r.taxable_earnings },
        },
        { nodeType: "form8880", fields: { able_sources_2026: r.source_input } },
        { nodeType: "form5329", fields: { able_sources_2026: r.source_input } },
      ],
    };
  }
}
export const able_accounts_2026 = new Able2026();
