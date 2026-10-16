import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
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
  line6d_elderly_disabled_credit: true,
}).extend({ schedule_r_inventory_reference: z.string().min(1).optional() })
  .strict();
class Schedule3Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f8812_2026]);
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "form8880"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 3 needs f1040:2026 context");
    }
    const { schedule_r_inventory_reference, ...amounts } = inputSchema.parse(
      raw,
    );
    const calculation = calculateSchedule3_2026(amounts);
    return {
      outputs: [
        {
          nodeType: "schedule3",
          fields: { pre_credit_calculation_2026: calculation },
        },
        {
          nodeType: "form8880",
          fields: {
            finalized_schedule_r_credit:
              calculation.input.line6d_elderly_disabled_credit ?? 0,
            finalized_education_credit:
              calculation.input.line3_education_credit ?? 0,
            finalized_dependent_care_credit:
              calculation.input.line2_childcare_credit ?? 0,
          },
        },
        {
          nodeType: "f8812",
          fields: {
            finalized_schedule_r_credit:
              calculation.input.line6d_elderly_disabled_credit ?? 0,
            ...(schedule_r_inventory_reference
              ? {
                schedule_r_inventory_reference_from_source:
                  schedule_r_inventory_reference,
              }
              : {}),
            finalized_education_credit:
              calculation.input.line3_education_credit ?? 0,
            finalized_dependent_care_credit:
              calculation.input.line2_childcare_credit ?? 0,
            finalized_excess_social_security:
              calculation.input.line11_excess_ss ?? 0,
          },
        },
      ],
    };
  }
}
export const schedule3_2026 = new Schedule3Node2026();
