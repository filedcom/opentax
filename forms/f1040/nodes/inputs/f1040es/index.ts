import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1040-ES — Estimated Tax for Individuals
// Captures quarterly estimated tax payments made during the year.
// Total payments are forwarded to Form 1040 line 26.
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
  // Actual payment dates — used to determine whether each quarterly payment was
  // timely for underpayment penalty purposes (IRC §6654); ISO 8601 date strings
  payment_q1_date: z.string().optional()
    .describe("Date Q1 estimated payment was made (ISO 8601, e.g. '2025-04-15')"),
  payment_q2_date: z.string().optional()
    .describe("Date Q2 estimated payment was made (ISO 8601, e.g. '2025-06-16')"),
  payment_q3_date: z.string().optional()
    .describe("Date Q3 estimated payment was made (ISO 8601, e.g. '2025-09-15')"),
  payment_q4_date: z.string().optional()
    .describe("Date Q4 estimated payment was made (ISO 8601, e.g. '2026-01-15')"),
  // Prior-year overpayment applied to current-year estimated tax —
  // counts as an estimated tax payment made on April 15 (IRC §6513(d));
  // flows to Form 1040 line 26 alongside quarterly payments
  applied_from_prior_year: z.number().nonnegative().optional()
    .describe("Overpayment from prior year applied to current year estimated tax (Form 1040 line 26)"),
});

class F1040esNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040es";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    const total =
      (input.payment_q1 ?? 0) +
      (input.payment_q2 ?? 0) +
      (input.payment_q3 ?? 0) +
      (input.payment_q4 ?? 0) +
      (input.applied_from_prior_year ?? 0);
    if (total === 0) return { outputs: [] };
    return {
      outputs: [{ nodeType: f1040.nodeType, fields: { line26_estimated_tax: total } }],
    };
  }
}

export const f1040es = new F1040esNode();
