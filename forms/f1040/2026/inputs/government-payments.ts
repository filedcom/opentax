import type { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  calculateGovernmentPayments2026,
  governmentClaim2026Schema,
} from "./government-source.ts";
export { governmentClaim2026Schema } from "./government-source.ts";
export const inputSchema = investmentOwner2026.extend(
  governmentClaim2026Schema.partial().shape,
).strict();
class GovernmentPayments2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "government_payments";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "schedule1", "f1040", "form6251", "schedule_a"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Government payments require f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const result = calculateGovernmentPayments2026({
        ...input,
        claim: input.claim,
      }),
      l = result.lines;
    const income = {
      line1_state_refund: l.state_refund,
      line7_unemployment: l.unemployment,
      line8z_rtaa: l.rtaa,
      line8z_taxable_grants: l.grants,
      line8z_family_leave: l.family_leave,
    };
    const stateTaxes = result.rows.filter((r) =>
      r.copy.state_information.some((s) => s.box12_state_withheld > 0)
    ).map(({ copy: c }) => ({
      document_type: "1099-G",
      source_document_reference: c.source_document_reference,
      recipient_tin: c.recipient_tin,
      payer_tin: c.payer_tin,
      account_number: c.account_number,
      // One federal deduction source per issued copy; preserve individual state
      // rows in the workpaper rather than claiming the same copy twice.
      state: c.state_information.map((s) => s.state).join("/"),
      payer_state_id: c.state_information.map((s) => s.payer_state_id).join(
        "/",
      ),
      state_withheld: c.state_information.reduce(
        (n, s) => n + Math.round(s.box12_state_withheld * 100),
        0,
      ) / 100,
    }));
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "agi_aggregator",
          fields: { ...income, government_sources_2026: result.source_input },
        },
        {
          nodeType: "schedule1",
          fields: { ...income, line7_repaid: l.repaid },
        },
        {
          nodeType: "f1040",
          fields: { line25b_withheld_1099: result.cents.federal_withheld },
        },
        {
          nodeType: "form6251",
          fields: { government_sources_2026: result.source_input },
        },
        ...(stateTaxes.length
          ? [{
            nodeType: "schedule_a",
            fields: { information_return_tax_sources: stateTaxes },
          }]
          : []),
      ],
    };
  }
}
export const government_payments_2026 = new GovernmentPayments2026();
