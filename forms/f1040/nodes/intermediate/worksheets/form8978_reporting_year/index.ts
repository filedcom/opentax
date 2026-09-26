import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { calculateForm8978NegativeAdjustment } from "../form8978_negative_adjustment.ts";

export const inputSchema = z.object({
  regular_tax: z.number().nonnegative().optional(),
  schedule2_part1_tax: z.number().nonnegative().optional(),
  schedule2_part2_tax: z.number().nonnegative().optional(),
  schedule2_chapter1_part2_tax: z.number().nonnegative().optional(),
  schedule2_unclassified_part2_tax: z.number().nonnegative().optional(),
  negative_form8978_line14: z.number().int().nonnegative().optional(),
});

type Input = z.infer<typeof inputSchema>;

class Form8978ReportingYearNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8978_reporting_year";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule3]);

  compute(_ctx: NodeContext, rawInput: Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const part1 = input.schedule2_part1_tax ?? 0;
    const part2 = input.schedule2_part2_tax ?? 0;
    const chapter1 = input.schedule2_chapter1_part2_tax ?? 0;
    const unclassified = input.schedule2_unclassified_part2_tax ?? 0;
    const negative = input.negative_form8978_line14 ?? 0;
    if (chapter1 + unclassified > part2 + 0.000001) {
      throw new Error("Schedule 2 tax classifications exceed Part II tax");
    }
    const worksheet = calculateForm8978NegativeAdjustment(
      negative,
      Math.round((input.regular_tax ?? 0) + part1),
      Math.round(chapter1),
    );
    if (worksheet.remainingUnapplied > 0 && unclassified > 0) {
      throw new Error(
        "Form 8978 Schedule 2 offset needs a chapter 1 classification for remaining unclassified Part II source taxes",
      );
    }
    const adjustedPart2 = part2 - worksheet.schedule2Line17zReduction;
    if (adjustedPart2 < -0.000001) {
      throw new Error("Form 8978 adjustment exceeds Schedule 2 Part II tax");
    }

    const outputs: NodeOutput[] = [];
    if (worksheet.schedule2Line17zReduction > 0) {
      outputs.push(this.outputNodes.output(f1040, {
        form8978_schedule2_line17z_reduction:
          worksheet.schedule2Line17zReduction,
      }));
    }
    if (worksheet.schedule3Line6l > 0) {
      outputs.push(this.outputNodes.output(schedule3, {
        line6l_form8978_credit: worksheet.schedule3Line6l,
      }));
    }
    if (negative > 0) {
      outputs.push({
        nodeType: this.nodeType,
        fields: {
          negative_form8978_line14: negative,
          schedule3_line6l: worksheet.schedule3Line6l,
          schedule2_line17z_reduction: worksheet.schedule2Line17zReduction,
          schedule2_line21: Math.max(0, adjustedPart2),
          remaining_unapplied: worksheet.remainingUnapplied,
        },
      });
    }
    return { outputs };
  }
}

export const form8978_reporting_year = new Form8978ReportingYearNode();
