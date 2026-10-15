import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812_2026 } from "./f8812.ts";
import {
  calculateSchedule3_2026,
  schedule3Input2026Schema,
} from "../schedule3.ts";

// Grow this selection with reviewed source owners, never caller-supplied totals.
export const inputSchema = schedule3Input2026Schema.pick({
  line11_excess_ss: true,
  line2_childcare_credit: true,
  line3_education_credit: true,
}).strict();
class Schedule3Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 3 needs f1040:2026 context");
    }
    const calculation = calculateSchedule3_2026(inputSchema.parse(raw));
    return {
      outputs: [
        { nodeType: "schedule3", fields: { calculation_2026: calculation } },
        {
          nodeType: "f8812",
          fields: {
            finalized_education_credit:
              calculation.input.line3_education_credit ?? 0,
            finalized_dependent_care_credit:
              calculation.input.line2_childcare_credit ?? 0,
            finalized_excess_social_security:
              calculation.input.line11_excess_ss ?? 0,
          },
        },
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
export const schedule3_2026 = new Schedule3Node2026();
