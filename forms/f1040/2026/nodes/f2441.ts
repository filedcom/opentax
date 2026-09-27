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
  calculateForm2441,
} from "../../nodes/intermediate/forms/form2441/calculation.ts";
import { schedule3_2026 } from "./schedule3.ts";

const amount = z.number().int().nonnegative();
const calculatedAmount = z.number().finite().nonnegative();
export const f2441Input2026Schema = z.object({
  filing_details: benefitDetailsSchema.optional(),
  dep_care_benefits: amount.optional(),
  agi: z.number().finite().optional(),
  line16_income_tax: calculatedAmount.optional(),
  schedule2_line3: calculatedAmount.optional(),
  schedule3_line1_foreign_tax: calculatedAmount.optional(),
  schedule3_line6l_form8978_credit: calculatedAmount.optional(),
}).strict();

class F2441Node2026 extends TaxNode<typeof f2441Input2026Schema> {
  readonly nodeType = "f2441";
  readonly inputSchema = f2441Input2026Schema;
  readonly outputNodes = new OutputNodes([schedule3_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof f2441Input2026Schema>,
  ): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 2441 credit requires f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    if (!input.filing_details) return { outputs: [] };
    if (input.agi === undefined || input.line16_income_tax === undefined) {
      throw new Error(
        "TY2026 Form 2441 credit needs calculated AGI and income tax",
      );
    }
    const line18 = input.line16_income_tax + (input.schedule2_line3 ?? 0);
    const previousCredits = (input.schedule3_line1_foreign_tax ?? 0) +
      (input.schedule3_line6l_form8978_credit ?? 0);
    const taxLimit = Math.max(0, Math.round(line18 - previousCredits));
    const lines = calculateForm2441(
      { ...input.filing_details, tax_liability_limit: taxLimit },
      input.agi,
      input.dep_care_benefits ?? 0,
      2026,
    );
    const outputs: NodeOutput[] = [];
    if (lines.line11 > 0) {
      outputs.push(this.outputNodes.output(schedule3_2026, {
        line2_childcare_credit: lines.line11,
      }));
    }
    outputs.push({
      nodeType: this.nodeType,
      fields: {
        filing_details: input.filing_details,
        dep_care_benefits: input.dep_care_benefits ?? 0,
        ...lines,
      },
    });
    return { outputs };
  }
}

export const f2441_2026 = new F2441Node2026();
