import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  calculateSchedule2_2026,
  type Schedule2Input2026,
  schedule2Input2026Schema,
} from "../schedule2.ts";
import { f1040_2026_node } from "./f1040.ts";

class Schedule2Node2026 extends TaxNode<typeof schedule2Input2026Schema> {
  readonly nodeType = "schedule2";
  readonly inputSchema = schedule2Input2026Schema;
  readonly outputNodes = new OutputNodes([f1040_2026_node]);

  compute(ctx: NodeContext, rawInput: Schedule2Input2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule 2 requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    if (!Object.values(input).some((value) => value > 0)) {
      return { outputs: [] };
    }
    const lines = calculateSchedule2_2026(input);
    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040_2026_node, {
        line17_additional_taxes: lines.line3_part1_tax,
        line23_other_taxes: lines.line21_total_additional_taxes,
        schedule2_line20: lines.line20_employment_and_other_taxes,
        credit_limit_schedule2_line1z: lines.line1z_additions,
      }),
      { nodeType: this.nodeType, fields: { ...input, ...lines } },
    ];
    return { outputs };
  }
}

export const schedule2_2026 = new Schedule2Node2026();
