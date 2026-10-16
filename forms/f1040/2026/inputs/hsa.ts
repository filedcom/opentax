import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateHsaReturnSources2026,
  hsaReturnSource2026Schema,
} from "./hsa-source.ts";
export const hsaClaimInput2026Schema = hsaReturnSource2026Schema.pick({
  claim: true,
});
const inputSchema = hsaReturnSource2026Schema.partial({ claim: true });
class Hsa2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "hsa_accounts";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "schedule1", "schedule2", "form5329", "f1099r"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("HSA sources need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) {
      if (
        input.wage_sources.some((w) =>
          w.box12_entries?.some((e) => e.code === "W" && e.amount > 0)
        )
      ) {
        throw Error(
          "W-2 code W requires the actual HSA account and annual source inventory",
        );
      }
      return { outputs: [] };
    }
    const r = calculateHsaReturnSources2026({ ...input, claim: input.claim });
    const income = {
      line8f_hsa_income: r.schedule1_line8f,
      line13_hsa_deduction: r.schedule1_line13,
      line8z_hsa_excess_earnings: r.schedule1_line8z_earnings,
      line8z_hsa_excess_employer: r.schedule1_line8z_employer,
    };
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "agi_aggregator",
          fields: { ...income, hsa_sources_2026: r.source_input },
        },
        { nodeType: "schedule1", fields: income },
        {
          nodeType: "schedule2",
          fields: {
            line13c_hsa_distribution_tax: r.schedule2_line13c,
            line13d_hsa_eligibility_tax: r.schedule2_line13d,
          },
        },
        { nodeType: "form5329", fields: { hsa_sources_2026: r.source_input } },
        ...(r.contribution_sources.qualified_funding_review
          ? [{
            nodeType: "f1099r",
            fields: { hsa_funding_sources_2026: r.contribution_sources },
          }]
          : []),
      ],
    };
  }
}
export const hsa_accounts_2026 = new Hsa2026();
