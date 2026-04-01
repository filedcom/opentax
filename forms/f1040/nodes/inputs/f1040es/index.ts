import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// Form 1040-ES — Estimated Tax for Individuals
// Captures quarterly estimated tax payments made during the year.
// Payments reduce tax owed or increase refund via Form 1040 Line 26.
// IRS Form 1040-ES instructions: https://www.irs.gov/pub/irs-pdf/f1040es.pdf

export const inputSchema = z.object({
  // Q1 payment (due ~April 15 for current year)
  payment_q1: z.number().nonnegative().optional(),
  // Q2 payment (due ~June 15)
  payment_q2: z.number().nonnegative().optional(),
  // Q3 payment (due ~September 15)
  payment_q3: z.number().nonnegative().optional(),
  // Q4 payment (due ~January 15 of following year)
  payment_q4: z.number().nonnegative().optional(),
});

function totalPayments(input: z.infer<typeof inputSchema>): number {
  return (
    (input.payment_q1 ?? 0) +
    (input.payment_q2 ?? 0) +
    (input.payment_q3 ?? 0) +
    (input.payment_q4 ?? 0)
  );
}

class F1040esNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040es";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const total = totalPayments(parsed);
    if (total === 0) return { outputs: [] };
    return {
      outputs: [{
        nodeType: f1040.nodeType,
        fields: { line26_estimated_tax: total },
      }],
    };
  }
}

export const f1040es = new F1040esNode();
