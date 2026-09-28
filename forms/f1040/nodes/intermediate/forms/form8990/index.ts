import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  assertReviewedZeroPriorForm8990Carryforward,
  priorCarryforwardSchema,
  type ReviewedZeroPriorForm8990Carryforward,
} from "./carryforward.ts";
import {
  assertCalculatedLimitForBusiness,
  type CalculatedBoundedForm8990Limit,
} from "./limit.ts";
import {
  assertFinalizedBoundedForm8990Return,
  type FinalizedBoundedForm8990Return,
} from "./final-reconciliation.ts";
import { priorFiledScheduleCSchema } from "./nonexempt-receipts.ts";
import { receiptSchema } from "./provisional-ati.ts";
import { businessInterestExpenseRecordSchema } from "./interest-expense.ts";

const amount = z.number().int().finite().nonnegative().max(999_999_999_999_999);

/** The only TY2025 public Form 8990 input is reviewed source records. */
export const publicInputSchema = z.object({
  receipts: z.array(receiptSchema).min(1),
  interestExpenseRecords: z.array(businessInterestExpenseRecordSchema).min(1),
  priorFiledScheduleCs: z.array(priorFiledScheduleCSchema).length(3),
  priorFiledForm8990: priorCarryforwardSchema,
}).strict();

export type Form8990PublicSource = z.infer<typeof publicInputSchema>;

// Optional fields let the ordinary DAG visit this node when no Form 8990
// source is present. Active sources must use the Form 1040 two-pass entrypoint.
export const inputSchema = publicInputSchema.partial();

export const form8990LinesSchema = z.object({
  line1: amount,
  line2: amount,
  line4: amount,
  line5: amount,
  line6: z.number().int().finite(),
  line7: amount,
  line8: amount,
  line9: amount,
  line10: amount,
  line11: amount,
  line16: amount,
  line18: amount,
  line21: amount,
  line22: amount,
  line23: amount,
  line25: amount,
  line26: amount,
  line29: amount,
  line30: amount,
  line31: amount,
});

export type Form8990Lines = z.infer<typeof form8990LinesSchema>;

/** Internal post-finalization node output; not accepted as a raw filing input. */
export function projectCalculatedBoundedForm8990Node(args: {
  readonly limit: CalculatedBoundedForm8990Limit;
  readonly finalized: FinalizedBoundedForm8990Return;
  readonly prior: ReviewedZeroPriorForm8990Carryforward;
}): NodeOutput {
  const { limit, finalized, prior } = args;
  assertReviewedZeroPriorForm8990Carryforward(prior);
  assertFinalizedBoundedForm8990Return(finalized);
  assertCalculatedLimitForBusiness(
    limit,
    finalized.businessReference,
    finalized.originalInterestExpense,
  );
  if (
    limit.line2 !== prior.targetLine2 ||
    limit.line30 !== finalized.allowedInterestExpense ||
    limit.line31 !== finalized.disallowedInterestExpense
  ) {
    throw new Error(
      "Form 8990 calculated node does not match finalized interest",
    );
  }
  const fields = form8990LinesSchema.parse({
    line1: limit.line1,
    line2: limit.line2,
    line4: limit.line4,
    line5: limit.line5,
    line6: limit.line6,
    line7: limit.line7,
    line8: limit.line8,
    line9: limit.line9,
    line10: limit.line10,
    line11: limit.line11,
    line16: limit.line16,
    line18: limit.line18,
    line21: limit.line21,
    line22: limit.line22,
    line23: limit.line23,
    line25: limit.line25,
    line26: limit.line26,
    line29: limit.line29,
    line30: limit.line30,
    line31: limit.line31,
  });
  return { nodeType: "form8990", fields };
}

class Form8990Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8990";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2025) throw new Error("Form 8990 route is TY2025 only");
    const input = inputSchema.parse(rawInput);
    if (Object.keys(input).length === 0) return { outputs: [] };
    throw new Error(
      "Form 8990 active sources require the Form 1040 two-pass execution path",
    );
  }
}

export const form8990 = new Form8990Node();
