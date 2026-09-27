import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812_2026 } from "./f8812.ts";

const amount = z.number().finite().nonnegative();
export const schedule3Base2026Schema = z.object({
  line1_total: amount,
  line2_childcare_credit: amount,
  line3_education_credit: amount,
  line4_retirement_savings_credit: amount,
  line6c_adoption_credit: amount,
  line6d_elderly_disabled_credit: amount,
  line6f_clean_vehicle_credit: amount,
  line6g_mortgage_interest_credit: amount,
  line6h_dc_homebuyer_credit: amount,
  line6l_form8978_credit: amount,
  line6m_prev_owned_clean_vehicle_credit: amount,
  line8_before_form5695: amount,
  line15_total: amount,
}).strict();

export const creditResolutionInput2026Schema = z.object({
  schedule3_base: schedule3Base2026Schema.optional(),
}).strict();

class CreditResolutionNode2026 extends TaxNode<
  typeof creditResolutionInput2026Schema
> {
  readonly nodeType = "credit_resolution";
  readonly inputSchema = creditResolutionInput2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof creditResolutionInput2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 credit resolution requires f1040:2026 context");
    }
    const { schedule3_base: base } = this.inputSchema.parse(rawInput);
    if (!base) return { outputs: [] };
    const outputs = [
      this.outputNodes.output(f8812_2026, {
        auto_schedule3_credit_lines: {
          schedule3_line1: base.line1_total,
          schedule3_line2: base.line2_childcare_credit,
          schedule3_line3: base.line3_education_credit,
          schedule3_line4: base.line4_retirement_savings_credit,
          schedule3_line6d: base.line6d_elderly_disabled_credit,
          schedule3_line6f: base.line6f_clean_vehicle_credit,
          schedule3_line6l: base.line6l_form8978_credit,
          schedule3_line6m: base.line6m_prev_owned_clean_vehicle_credit,
          schedule3_line5a: 0,
          schedule3_line6c: base.line6c_adoption_credit,
          schedule3_line6g: base.line6g_mortgage_interest_credit,
          schedule3_line6h: base.line6h_dc_homebuyer_credit,
        },
      }),
    ];
    if (base.line8_before_form5695 > 0 || base.line15_total > 0) {
      outputs.push(this.outputNodes.output(
        f1040_2026_node,
        base.line8_before_form5695 > 0
          ? {
            line20_nonrefundable_credits: base.line8_before_form5695,
            ...(base.line15_total > 0 && {
              line31_other_payments: base.line15_total,
            }),
          }
          : { line31_other_payments: base.line15_total },
      ));
    }
    return { outputs };
  }
}

export const credit_resolution_2026 = new CreditResolutionNode2026();
