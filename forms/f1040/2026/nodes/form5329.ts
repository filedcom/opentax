import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { schedule2_2026 } from "./schedule2.ts";

const amount = z.number().finite().nonnegative();
export const form5329Input2026Schema = z.object({
  recipient: z.enum(["taxpayer", "spouse"]),
  regular_early_distribution: amount,
  early_simple_ira_distribution: amount,
}).strict();

export function calculateForm5329PartI2026(
  rawInput: z.input<typeof form5329Input2026Schema>,
) {
  const input = form5329Input2026Schema.parse(rawInput);
  if (input.early_simple_ira_distribution <= 0) {
    throw new Error("TY2026 Form 5329 Part I needs early SIMPLE IRA tax");
  }
  const line1 = input.regular_early_distribution +
    input.early_simple_ira_distribution;
  const line4 = Math.round(
    input.regular_early_distribution * 0.1 +
      input.early_simple_ira_distribution * 0.25,
  );
  return {
    recipient: input.recipient,
    line1_early_distributions: line1,
    line2_exception: 0,
    line3_subject_to_tax: line1,
    line4_early_distribution_tax: line4,
    regular_early_distribution: input.regular_early_distribution,
    early_simple_ira_distribution: input.early_simple_ira_distribution,
  };
}

class Form5329Node2026 extends TaxNode<typeof form5329Input2026Schema> {
  readonly nodeType = "form5329";
  readonly inputSchema = form5329Input2026Schema;
  readonly outputNodes = new OutputNodes([schedule2_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof form5329Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 5329 requires f1040:2026 context");
    }
    const lines = calculateForm5329PartI2026(rawInput);
    return {
      outputs: [
        this.outputNodes.output(schedule2_2026, {
          line5_form5329_early_tax: lines.line4_early_distribution_tax,
        }),
        { nodeType: this.nodeType, fields: lines },
      ],
    };
  }
}

export const form5329_2026 = new Form5329Node2026();
