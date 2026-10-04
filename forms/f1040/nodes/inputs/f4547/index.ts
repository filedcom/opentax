import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";

// An affirmative request is retained even while the signed attachment route
// is closed. The export guard must see it rather than silently omit it.
export const inputSchema = z.object({
  requests: z.array(
    z.object({
      child_ssn: z.string().regex(/^\d{9}$/),
      initial_account_requested: z.boolean(),
      pilot_contribution_requested: z.boolean(),
      existing_account_reference: z.string().trim().min(1).optional(),
      request_confirmed_by_authorized_person: z.literal(true),
      request_record_reference: z.string().trim().min(1),
    }).strict().refine(
      (request) =>
        request.initial_account_requested ||
        request.pilot_contribution_requested,
      { message: "Form 4547 needs an account or pilot election" },
    ).refine(
      (request) =>
        !request.pilot_contribution_requested ||
        request.initial_account_requested ||
        request.existing_account_reference !== undefined,
      {
        message:
          "Form 4547 pilot-only election needs an existing child account reference",
      },
    ),
  ).min(1).max(100),
}).strict().refine(
  (source) =>
    new Set(source.requests.map((request) => request.child_ssn)).size ===
      source.requests.length,
  { message: "Form 4547 needs one election request per child SSN" },
);

class Form4547Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4547";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const f4547 = new Form4547Node();
