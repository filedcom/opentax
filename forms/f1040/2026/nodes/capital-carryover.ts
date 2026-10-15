import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { investmentOwner2026 } from "../inputs/investment-source.ts";
import { capitalLossCarryover } from "../inputs/capital-source.ts";
const signed = z.number().int().safe();
const inputSchema = investmentOwner2026.extend({
  schedule_d_line7: signed,
  schedule_d_line15: signed,
  form1040_line7a: signed,
  form1040_line11b: signed,
  form1040_line14: signed.nonnegative(),
  form1040_line15: signed.nonnegative(),
}).strict();
export function calculateCapitalCarryover2027(
  raw: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw),
    net = input.schedule_d_line7 + input.schedule_d_line15,
    limit = input.filing_status === "mfs" ? 1500 : 3000;
  const deduction = Math.min(limit, Math.max(0, -net)),
    taxable = input.form1040_line11b - input.form1040_line14;
  if (
    input.form1040_line7a !== (net < 0 ? -deduction : net) ||
    input.form1040_line15 !== Math.max(0, taxable)
  ) {
    throw new Error(
      "Capital carryforward needs reconciled current return income and deductions",
    );
  }
  return {
    source_tax_year: 2026,
    carryforward_tax_year: 2027,
    source_input: input,
    ...capitalLossCarryover(
      taxable,
      input.schedule_d_line7,
      input.schedule_d_line15,
      deduction,
    ),
  };
}
class CapitalCarryover2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "capital_loss_carryover";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(ctx: NodeContext, input: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Capital carryforward needs f1040:2026 context");
    }
    return {
      outputs: [{
        nodeType: this.nodeType,
        fields: { calculation_2026: calculateCapitalCarryover2027(input) },
      }],
    };
  }
}
export const capital_carryover_2026 = new CapitalCarryover2026Node();
