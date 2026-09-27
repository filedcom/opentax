import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// The continuous-use 2024 Form 8834 applies to TY2025. Its line 1 is a
// prior-year passive-activity credit *allowed this year* by Form 8582-CR.
// Vehicle cost and service date no longer generate a Form 8834 credit.
export const itemSchema = z.object({
  source_form: z.literal("8582-CR"),
  source_activity_id: z.string().trim().min(1),
  allowed_passive_activity_credit: z.number().finite().nonnegative(),
});

export const inputSchema = z.object({
  f8834s: z.array(itemSchema).min(1),
}).superRefine((input, ctx) => {
  const activityIds = new Set<string>();
  input.f8834s.forEach((item, index) => {
    if (activityIds.has(item.source_activity_id)) {
      ctx.addIssue({
        code: "custom",
        message: "Form 8834 source activity appears more than once",
        path: ["f8834s", index, "source_activity_id"],
      });
    }
    activityIds.add(item.source_activity_id);
  });
});

export function form8834SourceCredit(
  input: z.infer<typeof inputSchema>,
): number {
  return input.f8834s.reduce(
    (sum, item) => sum + item.allowed_passive_activity_credit,
    0,
  );
}

class F8834Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8834";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251, f1040]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    const source = form8834SourceCredit(input);
    if (source <= 0) return { outputs: [] };
    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule3, {
        form8834_source_credit_pending: true,
      }),
      this.outputNodes.output(form6251, { must_file_for_credit: true }),
      this.outputNodes.output(f1040, { form8834_source_credit: source }),
    ];
    return { outputs };
  }
}

export const f8834 = new F8834Node();
