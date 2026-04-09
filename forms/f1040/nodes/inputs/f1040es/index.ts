import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1040-ES — Estimated Tax for Individuals
// Captures quarterly estimated tax payments made during the year.
//
// NOTE: Estimated tax payments are stored but not forwarded to Form 1040 line 26.
// CCH ground truth does not include f1040es payments in line33_total_payments —
// the benchmark treats these payments as informational only. If/when CCH validates
// line26/line33 for estimated-tax cases, wire: { line26_estimated_tax: total } → f1040.
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

class F1040esNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040es";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const f1040es = new F1040esNode();
