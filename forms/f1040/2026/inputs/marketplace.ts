import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  marketplaceReturnClaim2026Schema,
  marketplaceReturnSources2026Schema,
} from "./marketplace-return.ts";
import { marketplaceTaxFamily2026Schema } from "./marketplace-family.ts";
import { prepareMarketplace2026 } from "./marketplace-preparation.ts";

const inputSchema = marketplaceReturnClaim2026Schema.partial().extend({
  tax_family: marketplaceTaxFamily2026Schema,
}).strict();
class Marketplace2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1095a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["form8962", "form1062"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Marketplace needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) {
      if (input.family_review || input.medical_review || input.income_review) {
        throw new Error(
          "Marketplace reviews need the matching issued-copy claim",
        );
      }
      return { outputs: [] };
    }
    const sources = marketplaceReturnSources2026Schema.parse(input);
    prepareMarketplace2026(sources.tax_family, {
      claim: sources.claim,
      family_review: sources.family_review,
    });
    return {
      outputs: [
        { nodeType: "form8962", fields: { marketplace_sources_2026: sources } },
        { nodeType: "form1062", fields: { marketplace_sources_present: true } },
      ],
    };
  }
}
export const f1095a_2026 = new Marketplace2026Node();
