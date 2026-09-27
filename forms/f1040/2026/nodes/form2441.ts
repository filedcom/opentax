import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  benefitDetailsSchema,
  calculateForm2441Benefits,
} from "../../nodes/intermediate/forms/form2441/calculation.ts";
import { filingStatusSchema } from "../../nodes/types.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f2441_2026 } from "./f2441.ts";

export const form2441Input2026Schema = z.object({
  filing_details: benefitDetailsSchema.optional(),
  return_filing_status: filingStatusSchema.optional(),
  dep_care_benefits: z.number().finite().nonnegative().optional(),
}).strict();

class Form2441Node2026 extends TaxNode<typeof form2441Input2026Schema> {
  readonly nodeType = "form2441";
  readonly inputSchema = form2441Input2026Schema;
  readonly outputNodes = new OutputNodes([
    agi_aggregator,
    f1040_2026_node,
    f2441_2026,
  ]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof form2441Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 2441 requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    const details = input.filing_details;
    const benefits = Math.round(input.dep_care_benefits ?? 0);
    if (!details) {
      if (benefits > 0) {
        throw new Error("TY2026 W-2 box 10 needs Form 2441 filing details");
      }
      return { outputs: [] };
    }
    if (
      input.return_filing_status !== undefined &&
      details.filing_status !== input.return_filing_status
    ) {
      throw new Error(
        "TY2026 Form 2441 filing status disagrees with Form 1040",
      );
    }
    if (details.student_or_disabled_deemed_income_used === true) {
      throw new Error(
        "TY2026 Form 2441 student or disability income needs monthly facts",
      );
    }
    const lines = calculateForm2441Benefits(details, benefits, 2026);
    const outputs: NodeOutput[] = [];
    if (lines.line26 > 0) {
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line1e_taxable_dep_care: lines.line26,
      }));
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line1e_taxable_dep_care: lines.line26,
      }));
    }
    outputs.push(this.outputNodes.output(f2441_2026, {
      filing_details: details,
      dep_care_benefits: benefits,
    }));
    outputs.push({ nodeType: this.nodeType, fields: { ...input, ...lines } });
    return { outputs };
  }
}

export const form2441_2026 = new Form2441Node2026();
