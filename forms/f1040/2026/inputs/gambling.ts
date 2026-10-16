import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  calculateGambling2026,
  gamblingClaim2026Schema,
} from "./gambling-source.ts";
const inputSchema = investmentOwner2026.extend(
  gamblingClaim2026Schema.partial().shape,
).strict();
class Gambling2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "gambling";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "schedule1", "schedule_a", "f1040", "f8615"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Gambling requires f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const r = calculateGambling2026({ ...input, claim: input.claim });
    const state = r.source_input.claim.copies.filter((c) =>
      c.box15_state_withheld + c.box17_local_withheld > 0
    ).map((c) => ({
      document_type: "W-2G",
      source_document_reference: c.source_document_reference,
      recipient_tin: c.box9_winner_tin,
      payer_tin: c.payer_ein,
      account_number: c.source_document_reference,
      state: c.box13_state ?? c.box18_locality!,
      payer_state_id: c.box13_payer_state_id ?? c.box18_locality!,
      state_withheld: c.box15_state_withheld + c.box17_local_withheld,
    }));
    return {
      outputs: [
        {
          nodeType: "f8615",
          fields: { gambling_sources_2026: r.source_input },
        },
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "agi_aggregator",
          fields: {
            line8b_gambling_winnings: r.winnings,
            gambling_sources_2026: r.source_input,
          },
        },
        {
          nodeType: "schedule1",
          fields: { line8b_gambling_winnings: r.winnings },
        },
        {
          nodeType: "f1040",
          fields: { line25c_other_withheld: r.federal_withheld },
        },
        {
          nodeType: "schedule_a",
          fields: {
            ...(r.losses > 0 ? { gambling_source_2026: r.source_input } : {}),
            ...(state.length ? { information_return_tax_sources: state } : {}),
          },
        },
      ],
    };
  }
}
export const gambling_2026 = new Gambling2026();
