import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { f1040_2026_node } from "./f1040.ts";

const amount = z.number().finite().nonnegative();
const benefitBoxes = {
  box3_gross_benefits: amount,
  box4_repaid: amount,
  box5_net_benefits: z.number().finite(),
};

/** SSA-1099 box 6 and RRB-1099 box 10 have the same return destination. */
export const ssa1099Item2026Schema = z.discriminatedUnion("statement_type", [
  z.object({
    statement_type: z.literal("ssa1099"),
    ...benefitBoxes,
    box6_federal_withheld: amount.optional(),
  }).strict(),
  z.object({
    statement_type: z.literal("rrb1099"),
    ...benefitBoxes,
    box10_federal_withheld: amount.optional(),
  }).strict(),
]);

export const ssa1099Input2026Schema = z.object({
  statements: z.array(ssa1099Item2026Schema).min(1),
}).strict();

class Ssa1099Node2026 extends TaxNode<typeof ssa1099Input2026Schema> {
  readonly nodeType = "ssa1099";
  readonly inputSchema = ssa1099Input2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, agi_aggregator]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof ssa1099Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 SSA-1099 requires f1040:2026 context");
    }
    const { statements } = this.inputSchema.parse(rawInput);
    let netBenefits = 0;
    let withholding = 0;
    for (const statement of statements) {
      if (
        Math.round(statement.box5_net_benefits * 100) !==
          Math.round(
            (statement.box3_gross_benefits - statement.box4_repaid) * 100,
          )
      ) {
        throw new Error("TY2026 SSA/RRB box 5 disagrees with boxes 3 and 4");
      }
      netBenefits += statement.box5_net_benefits;
      withholding += statement.statement_type === "ssa1099"
        ? statement.box6_federal_withheld ?? 0
        : statement.box10_federal_withheld ?? 0;
    }
    if (netBenefits < 0) {
      throw new Error(
        "TY2026 benefit repayments exceed benefits; repayment deduction needs calculation",
      );
    }
    const outputs: NodeOutput[] = [];
    if (netBenefits > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line6a_ss_gross: netBenefits,
        ...(withholding > 0 && { line25b_withheld_1099: withholding }),
      }));
    } else if (withholding > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line25b_withheld_1099: withholding,
      }));
    }
    if (netBenefits > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line6a_ss_gross: netBenefits,
      }));
    }
    outputs.push({
      nodeType: this.nodeType,
      fields: { statements, net_benefits: netBenefits, withholding },
    });
    return { outputs };
  }
}

export const ssa1099_2026 = new Ssa1099Node2026();
