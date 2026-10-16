import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "./f1040.ts";
import {
  calculateSchedule3_2026,
  schedule3Input2026Schema,
} from "../schedule3.ts";
const inputSchema = schedule3Input2026Schema.pick({
  line11_excess_ss: true,
  line9_premium_tax_credit: true,
  line2_childcare_credit: true,
  line3_education_credit: true,
  line4_retirement_savings_credit: true,
  line6d_elderly_disabled_credit: true,
  line6c_adoption_credit: true,
  line5a_residential_clean_energy: true,
  line13e_section1062_tax: true,
  line10_amount_paid_extension: true,
}).strict();
/** Final total follows the atomic energy/child-credit resolution. */
class Schedule3Final2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3_final";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040_2026_node]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 3 needs f1040:2026 context");
    }
    const calculation = calculateSchedule3_2026(inputSchema.parse(raw));
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "f1040",
          fields: {
            line20_nonrefundable_credits: calculation.lines.line8_total,
            line31_other_payments: calculation.lines.line15_total,
          },
        },
      ],
    };
  }
}
export const schedule3_final_2026 = new Schedule3Final2026();
