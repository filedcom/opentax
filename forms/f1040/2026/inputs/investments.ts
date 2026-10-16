import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateInvestmentClaim2026,
  investmentClaim2026Schema,
  investmentSource2026Schema,
} from "./investment-claim.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { schedule1_2026 } from "../nodes/schedule1.ts";
import { schedule_a_2026 } from "../nodes/schedule-a.ts";
import { income_tax_2026 } from "../nodes/income-tax.ts";
import { form6251_2026 } from "../nodes/form6251.ts";
import { form8960_2026 } from "../nodes/form8960.ts";
export { investmentClaim2026Schema } from "./investment-claim.ts";
export const inputSchema = investmentClaim2026Schema.partial().extend(
  investmentOwner2026.shape,
).strict();
class InvestmentsNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "investment_income";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    agi_2026,
    schedule1_2026,
    schedule_a_2026,
    income_tax_2026,
    form6251_2026,
    form8960_2026,
  ]);
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "capital_gains", "f8938"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Investment sources need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    const {
      filing_status: _status,
      taxpayer_ssn: _taxpayer,
      spouse_ssn: _spouse,
      ...maybeClaim
    } = input;
    if (Object.keys(maybeClaim).length === 0) return { outputs: [] };
    const result = calculateInvestmentClaim2026(
      investmentSource2026Schema.parse(input),
    );
    const claim = investmentClaim2026Schema.parse(maybeClaim);
    const c = result.cents, lines = result.lines;
    const stateTaxes = [
      ...result.source_input.f1099ints.filter((i) => i.box17 > 0).map((i) => ({
        document_type: "1099-INT" as const,
        source_document_reference: i.source_document_reference,
        recipient_tin: i.recipient_tin,
        payer_tin: i.payer_tin,
        account_number: i.account_number,
        state: i.box15!,
        payer_state_id: i.box16!,
        state_withheld: i.box17,
      })),
      ...result.source_input.f1099divs.filter((i) => i.box16 > 0).map((i) => ({
        document_type: "1099-DIV" as const,
        source_document_reference: i.source_document_reference,
        recipient_tin: i.recipient_tin,
        payer_tin: i.payerTin,
        account_number: i.account_number,
        state: i.box14!,
        payer_state_id: i.box15!,
        state_withheld: i.box16,
      })),
    ];
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "capital_gains",
          fields: { investment_sources_2026: claim },
        },
        // These are aggregate income categories. Withholding and exempt income
        // retain cents so future OTHER source types can join the same line once.
        {
          nodeType: "f1040",
          fields: {
            line2b_taxable_interest: lines.line2b,
            line3b_ordinary_dividends: c.ordinary_dividends,
            line3a_qualified_dividends: c.qualified_dividends,
            line2a_tax_exempt: c.tax_exempt_interest,
            line25b_withheld_1099: c.federal_withholding,
          },
        },
        {
          nodeType: "agi_aggregator",
          fields: {
            line2b_taxable_interest: c.taxable_interest,
            line3b_ordinary_dividends: c.ordinary_dividends,
            tax_exempt_interest: c.tax_exempt_interest,
            line18_early_withdrawal: lines.early_withdrawal_penalty,
          },
        },
        {
          nodeType: "schedule1",
          fields: { line18_early_withdrawal: lines.early_withdrawal_penalty },
        },
        {
          nodeType: "income_tax_calculation",
          fields: {
            qualified_dividends: c.qualified_dividends,
          },
        },
        { nodeType: "form6251", fields: { investment_sources_2026: claim } },
        { nodeType: "form8960", fields: { investment_sources_2026: claim } },
        {
          nodeType: "f8938",
          fields: { investment_sources_2026: result.source_input },
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
export const investments_2026 = new InvestmentsNode2026();
