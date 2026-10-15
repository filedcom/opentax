import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "./f1040.ts";
import {
  calculateSchedule2_2026,
  schedule2Input2026Schema,
} from "../schedule2.ts";

// Only reviewed, connected sources are accepted here. The pure finalizer has
// the full line contract; each remaining source must be audited before wiring.
export const inputSchema = schedule2Input2026Schema.pick({
  line2_amt: true,
  line16a_form4137_tip_tax: true,
  line16b_form8919_wage_tax: true,
  line17b_medicare_wage_tax: true,
  line11_medicare_self_employment_tax: true,
  line17c_w2_uncollected_fica: true,
  line13k_golden_parachute_tax: true,
}).strict();
class Schedule2Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule2";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040_2026_node]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 2 needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    const lines = calculateSchedule2_2026(input);
    return {
      outputs: [
        {
          nodeType: "schedule2",
          fields: {
            ...input,
            ...lines,
            file_schedule2: lines.line3_part1_tax > 0 ||
              lines.line21_total_additional_taxes > 0,
          },
        },
        {
          nodeType: "f1040",
          fields: {
            line17_additional_taxes: lines.line3_part1_tax,
            line23_other_taxes: lines.line21_total_additional_taxes,
            schedule2_line20: lines.line20_employment_and_other_taxes,
          },
        },
      ],
    };
  }
}
export const schedule2_2026 = new Schedule2Node2026();
