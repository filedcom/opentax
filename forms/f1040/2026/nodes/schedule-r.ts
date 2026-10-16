import type { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  calculateScheduleR2026,
  scheduleRSource2026Schema,
} from "../inputs/schedule-r-source.ts";
class ScheduleR2026 extends TaxNode<typeof scheduleRSource2026Schema> {
  readonly nodeType = "schedule_r";
  readonly inputSchema = scheduleRSource2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["f8863", "schedule3", "form1062"];
  }
  compute(
    ctx: NodeContext,
    raw: z.input<typeof scheduleRSource2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw Error("Schedule R needs f1040:2026 context");
    }
    const r = calculateScheduleR2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "f8863",
          fields: { finalized_schedule_r_credit: r.lines?.line22 ?? 0 },
        },
        {
          nodeType: "schedule3",
          fields: {
            line6d_elderly_disabled_credit: r.lines?.line22 ?? 0,
            ...(r.source_input.claim
              ? {
                schedule_r_inventory_reference:
                  r.source_input.claim.record_reference,
              }
              : {}),
          },
        },
        ...(r.source_input.claim
          ? [{ nodeType: "form1062", fields: { schedule_r: r.source_input } }]
          : []),
      ],
    };
  }
}
export const schedule_r_2026 = new ScheduleR2026();
