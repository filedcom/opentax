import { inputSchema as w2Schema, w2 } from "../w2/index.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { inputSchema } from "./schema.ts";
export { inputSchema } from "./schema.ts";
class QbiPatronNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qbi_patron";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8995, scheduleC, schedule_f, w2]);
  compute(_ctx: unknown, raw: unknown) {
    const review = inputSchema.parse(raw);
    if (review.spouse_w2_sources) {
      w2Schema.parse({ w2s: review.spouse_w2_sources });
    }
    return {
      outputs: [
        ...(review.spouse_w2_sources
          ? [this.outputNodes.output(w2, { patron_filing_review: review })]
          : []),
        this.outputNodes.output(form8995, {
          patron_source_review: review,
        }),
        this.outputNodes.output(
          review.business.kind === "schedule_c" ? scheduleC : schedule_f,
          { patron_filing_review: review },
        ),
      ],
    };
  }
}
export const qbiPatron = new QbiPatronNode();
