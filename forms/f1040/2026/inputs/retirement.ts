import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateRetirementSources2026,
  retirementSource2026Schema,
} from "./retirement-source.ts";
import { sumSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const inputSchema = retirementSource2026Schema.partial({ claim: true });
class Retirement2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099r";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "f1040", "schedule_a", "schedule2"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Retirement sources need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (!input.claim) return { outputs: [] };
    const r = calculateRetirementSources2026({ ...input, claim: input.claim });
    if (r.cents.line1h_disability_wages > 0) {
      throw new Error(
        "2026 disability pension wages need the earned-income credit and dependent-income source bridges before return assembly",
      );
    }
    const taxes = r.rows.flatMap(({ copy: c, owner_tin }) => {
      const amount = sumSourceMoney([
        ...c.state_information.map((s) => s.box14_state_withheld),
        ...c.local_information.map((s) => s.box17_local_withheld),
      ]);
      return amount > 0
        ? [{
          document_type: "1099-R",
          source_document_reference: c.source_document_reference,
          recipient_tin: owner_tin,
          payer_tin: c.payer_tin,
          account_number: c.account_number,
          statement_identifier: c.statement_identifier,
          state: [
            ...c.state_information.map((s) => s.state),
            ...c.local_information.map((s) => s.locality),
          ].join("/"),
          payer_state_id: [
            ...c.state_information.map((s) => s.payer_state_id),
            ...c.local_information.map((s) => s.locality),
          ].join("/"),
          state_withheld: amount,
        }]
        : [];
    });
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "agi_aggregator",
          fields: {
            retirement_sources_2026: r.source_input,
            line4b_ira_taxable: r.cents.line4b_ira_taxable,
            line5b_pension_taxable: r.cents.line5b_pension_taxable,
          },
        },
        {
          nodeType: "f1040",
          fields: {
            ...r.filed_lines,
            line25b_withheld_1099: r.cents.line25b_withheld_1099,
          },
        },
        ...(r.early_owners.length
          ? [{
            nodeType: "schedule2",
            fields: { line5_form5329_early_tax: r.line5_early_tax },
          }]
          : []),
        ...(taxes.length
          ? [{
            nodeType: "schedule_a",
            fields: { information_return_tax_sources: taxes },
          }]
          : []),
      ],
    };
  }
}
export const retirement_2026 = new Retirement2026();
