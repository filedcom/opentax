import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import {
  foreignCountrySchema,
  schedule_b,
} from "../../intermediate/aggregation/schedule_b/index.ts";

export const inputSchema = z.object({
  foreign_accounts_question: z.boolean(),
  fincen_form114_required: z.boolean().optional(),
  foreign_countries: z.array(foreignCountrySchema).max(25).optional(),
  foreign_trust_question: z.boolean(),
}).superRefine((input, ctx) => {
  if (
    input.foreign_accounts_question &&
    input.fincen_form114_required === undefined
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Schedule B needs the separate FinCEN Form 114 filing answer",
    });
  }
  if (
    input.fincen_form114_required &&
    (!input.foreign_countries || input.foreign_countries.length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "FBAR filing requires foreign country names and IRS codes",
    });
  }
  if (
    input.foreign_countries?.length &&
    input.fincen_form114_required !== true
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Foreign country list requires an affirmative FBAR answer",
    });
  }
});

class ScheduleBPartIIINode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_b_part_iii";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    return {
      outputs: [this.outputNodes.output(schedule_b, input)],
    };
  }
}

export const schedule_b_part_iii = new ScheduleBPartIIINode();
