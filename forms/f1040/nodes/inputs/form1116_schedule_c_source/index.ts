import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  form_1116,
  redeterminationDisclosureSchema,
} from "../../intermediate/forms/form_1116/index.ts";

/** Source-backed current-year Schedule C event and filed-return review. */
export const inputSchema = z.object({
  ledgers: z.array(redeterminationDisclosureSchema).min(1),
}).strict().superRefine((input, ctx) => {
  const keys = input.ledgers.map((ledger) =>
    `${ledger.income_category}:${ledger.relation_back_year_end}`
  );
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({
      code: "custom",
      path: ["ledgers"],
      message: "Form 1116 Schedule C needs one ledger per category and relation-back year",
    });
  }
});

class Form1116ScheduleCSourceNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form1116_schedule_c_source";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form_1116]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(raw);
    return {
      outputs: [this.outputNodes.output(form_1116, {
        foreign_tax_redeterminations: input.ledgers,
      })],
    };
  }
}

export const form1116_schedule_c_source = new Form1116ScheduleCSourceNode();
