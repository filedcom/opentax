import type { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  energyClaim2026Schema,
  reconcileEnergySource2026,
} from "./energy-source.ts";
export const inputSchema = investmentOwner2026.extend(
  energyClaim2026Schema.partial().shape,
).strict();
class Energy2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5695";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["f8812"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Energy carryforward needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const source = reconcileEnergySource2026({ ...input, claim: input.claim });
    return {
      outputs: [{ nodeType: "f8812", fields: { energy_sources_2026: source } }],
    };
  }
}
export const f5695_2026 = new Energy2026();
