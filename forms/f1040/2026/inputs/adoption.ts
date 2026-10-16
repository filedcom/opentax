import { dependent2026Schema } from "./dependents.ts";
import { z } from "zod";
import {
  adoptionSource2026Schema,
  prepareAdoptionSources2026,
} from "./adoption-source.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { sourceCents } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
export const adoptionClaim2026Schema = adoptionSource2026Schema.pick({
  claim: true,
});
export const inputSchema = adoptionSource2026Schema.partial({ claim: true })
  .extend({
    wage_sources: adoptionSource2026Schema.shape.wage_sources.default([]),
    dependent_sources: z.array(dependent2026Schema).default([]),
    adoption_benefits: z.number().finite().nonnegative().default(0),
  }).strict();
/** Only the claim is public. General and W-2 own identity and issued benefits. */
class Adoption2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8839";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("Adoption sources need f1040:2026 context");
    }
    const { adoption_benefits, dependent_sources, ...input } = inputSchema
      .parse(raw);
    const codeT = input.wage_sources.flatMap((w) => w.box12_entries ?? [])
      .filter((e) => e.code === "T").reduce(
        (n, e) => n + sourceCents(e.amount),
        0,
      );
    if (sourceCents(adoption_benefits) !== codeT) {
      throw Error("Adoption benefits must reconcile actual W-2 code T records");
    }
    if (!input.claim) {
      if (codeT > 0) {
        throw Error(
          "W-2 adoption benefits require the child and employer-program source review",
        );
      }
      return { outputs: [] };
    }
    for (const child of input.claim.children) {
      const d = dependent_sources.find((d) =>
        (d.ssn ?? d.itin ?? d.atin)?.replaceAll("-", "") ===
          child.identifying_number
      );
      if (
        d &&
        (d.first_name !== child.first_name || d.last_name !== child.last_name ||
          d.dob !== child.date_of_birth)
      ) {
        throw Error(
          "Adoption child identity must match the actual dependent source",
        );
      }
    }
    const r = prepareAdoptionSources2026({ ...input, claim: input.claim });
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { source_workpaper_2026: r } },
        {
          nodeType: "agi_aggregator",
          fields: { adoption_sources_2026: r.source_input },
        },
      ],
    };
  }
}
export const adoption_2026 = new Adoption2026Node();
