import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  form_1116,
  singleSourcePdfReviewSchema,
} from "../../intermediate/forms/form_1116/index.ts";

/** The narrow TY2025 zero-foreign-preferential-income source review. */
export const inputSchema = z.object({
  all_foreign_sources_reviewed: z.literal(true),
  foreign_qualified_dividends: z.literal(0),
  foreign_capital_gains_or_losses_present: z.literal(false),
  source_document_references: z.array(z.string().trim().min(1)).min(1),
  no_amt_liability_verified: z.literal(true),
  single_source_pdf_review: singleSourcePdfReviewSchema.optional(),
}).strict();

class Form1116ReviewNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form1116_review";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form_1116]);

  compute(_ctx: NodeContext, raw: z.infer<typeof inputSchema>): NodeResult {
    const review = inputSchema.parse(raw);
    const { single_source_pdf_review, ...preferential } = review;
    return {
      outputs: [this.outputNodes.output(form_1116, {
        foreign_preferential_income_review: preferential,
        single_source_pdf_review,
      })],
    };
  }
}

export const form1116_review = new Form1116ReviewNode();
