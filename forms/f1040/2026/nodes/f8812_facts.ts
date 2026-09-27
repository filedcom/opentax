import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeOutput } from "../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { f8812Facts2026Schema } from "../credit-facts.ts";
import { credit_resolution_2026 } from "./credit_resolution.ts";
import { f8812_2026 } from "./f8812.ts";

class F8812FactsNode2026 extends TaxNode<typeof f8812Facts2026Schema> {
  readonly nodeType = "f8812_facts";
  readonly inputSchema = f8812Facts2026Schema;
  readonly outputNodes = new OutputNodes([credit_resolution_2026, f8812_2026]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f8812Facts2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule 8812 facts require f1040:2026 context");
    }
    const input = this.inputSchema.parse(rawInput);
    const outputs: NodeOutput[] = [
      this.outputNodes.output(credit_resolution_2026, {
        credit_facts: input,
      }),
    ];
    const finalFacts = {
      ...(input.earned_income_worksheet && {
        earned_income_worksheet: input.earned_income_worksheet,
      }),
      ...(input.line18a_earned_income !== undefined && {
        line18a_earned_income: input.line18a_earned_income,
      }),
      ...(input.part_iib_2026 && { part_iib_2026: input.part_iib_2026 }),
      auto_puerto_rico_excluded_income: input.puerto_rico_excluded_income ?? 0,
      auto_form_2555_amounts: input.form2555_amounts ?? 0,
      auto_form_4563_amount: input.form4563_amount ?? 0,
      auto_has_form_2555: input.files_form2555 ?? false,
      auto_bona_fide_pr_resident: input.bona_fide_pr_resident ?? false,
    };
    outputs.push(this.outputNodes.output(f8812_2026, finalFacts));
    outputs.push({ nodeType: this.nodeType, fields: input });
    return { outputs };
  }
}

export const f8812_facts_2026 = new F8812FactsNode2026();
