import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import type { z } from "zod";
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
  line1a_excess_advance_premium: true,
  line17a_household_employment_tax: true,
  line4_self_employment_tax: true,
  line5_form5329_early_tax: true,
  line6_niit: true,
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
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "f2441", "f8863", "form1062"];
  }
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 2 needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    const lines = calculateSchedule2_2026(input);
    return {
      outputs: [
        {
          nodeType: "form1062",
          fields: {
            schedule2: input,
            line17_additional_taxes: lines.line3_part1_tax,
            line23_other_taxes: lines.line21_total_additional_taxes,
          },
        },
        {
          nodeType: "f8863",
          fields: { schedule2_part1_tax: lines.line3_part1_tax },
        },
        {
          nodeType: "f2441",
          fields: { schedule2_part1_tax: lines.line3_part1_tax },
        },
        {
          nodeType: "f8812",
          fields: {
            schedule2_part1_tax: lines.line3_part1_tax,
            schedule2_line16c: lines.line16c_additional_fica,
            schedule2_line17c: input.line17c_w2_uncollected_fica ?? 0,
          },
        },
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
