import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { filed2024Form8582RecordSchema } from "../../intermediate/forms/form8582/prior_year_import.ts";
import { scheduleE } from "../schedule_e/index.ts";

export const inputSchema = z.object({
  record: filed2024Form8582RecordSchema,
}).strict();

class Form8582PriorYearRecordNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8582_prior_year_record";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleE]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(raw);
    return {
      outputs: [this.outputNodes.output(scheduleE, {
        filed_2024_form8582_record: input.record,
      })],
    };
  }
}

export const form8582_prior_year_record = new Form8582PriorYearRecordNode();
