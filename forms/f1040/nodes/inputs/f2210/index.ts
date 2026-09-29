import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { computeRegularMethodPenalty } from "./calculation.ts";
import {
  calculateForm2210BoxEPage1,
  form2210BoxEInputSchema,
} from "../../../2025/form2210_box_e.ts";

export const inputSchema = z.object({
  // Required annual payment — IRS computes this; user may override
  required_annual_payment: z.number().nonnegative().optional(),
  // Total federal income tax withheld for the year
  withholding: z.number().nonnegative().optional(),
  // Estimated tax payments by quarter
  q1_estimated_payment: z.number().nonnegative().optional(),
  q2_estimated_payment: z.number().nonnegative().optional(),
  q3_estimated_payment: z.number().nonnegative().optional(),
  q4_estimated_payment: z.number().nonnegative().optional(),
  // Current year total tax (before credits) — for 90% safe harbor
  current_year_tax: z.number().nonnegative().optional(),
  // Prior year total tax — for 100%/110% safe harbor
  prior_year_tax: z.number().nonnegative().optional(),
  // Prior year AGI — determines whether 110% rule applies
  prior_year_agi: z.number().nonnegative().optional(),
  // Underpayment penalty amount (user-provided or pre-computed)
  underpayment_penalty: z.number().nonnegative().optional(),
  // Waiver requested (farmer/fisherman, casualty, other)
  waiver_requested: z.boolean().optional(),
  // Part II box B: partial waiver requires a calculated penalty and attached
  // Form 2210 plus explanation/evidence, not just an asserted penalty amount.
  partial_waiver_requested: z.boolean().optional(),
  // Annualized income installment method elected
  annualized_method: z.boolean().optional(),
  // Part II box D: actual withholding-date method requires dated source
  // withholding and the filed Part III computation.
  actual_withholding_dates_method: z.boolean().optional(),
  // Part II box E: joint filing status changed between 2024 and 2025, and
  // the prior-year payment is the smaller safe-harbor amount. Page 1 attaches.
  joint_filing_status_change: z.boolean().optional(),
  // Staged page-1 box E source. Calculates Part I only; export remains blocked
  // until prior returns are bound to reviewed bytes and current lines finalized.
  box_e_source: form2210BoxEInputSchema.optional(),
});

type F2210Input = z.infer<typeof inputSchema>;

function computePenalty(input: F2210Input): number {
  if (
    input.current_year_tax === undefined &&
    input.underpayment_penalty === undefined
  ) return 0;
  return computeRegularMethodPenalty({
    ...input,
    current_year_tax: input.current_year_tax ?? 0,
  });
}

class F2210Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2210";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    if (Object.keys(parsed).length === 0) return { outputs: [] };
    if (parsed.box_e_source !== undefined) {
      calculateForm2210BoxEPage1(parsed.box_e_source);
      return { outputs: [] };
    }
    if (
      parsed.waiver_requested === true ||
      parsed.partial_waiver_requested === true ||
      parsed.annualized_method === true ||
      parsed.actual_withholding_dates_method === true ||
      parsed.joint_filing_status_change === true
    ) return { outputs: [] };
    if (parsed.underpayment_penalty !== undefined) {
      if (parsed.underpayment_penalty === 0) return { outputs: [] };
      return {
        outputs: [output(f1040, {
          line38_underpayment_penalty: parsed.underpayment_penalty,
        })],
      };
    }
    if (parsed.current_year_tax !== undefined) {
      const penalty = computePenalty(parsed);
      if (penalty === 0) return { outputs: [] };
      return {
        outputs: [output(f1040, { line38_underpayment_penalty: penalty })],
      };
    }

    return {
      outputs: [output(f1040, {
        f2210_active: true,
        f2210_required_annual_payment: parsed.required_annual_payment,
        f2210_withholding: parsed.withholding,
        f2210_q1_estimated_payment: parsed.q1_estimated_payment,
        f2210_q2_estimated_payment: parsed.q2_estimated_payment,
        f2210_q3_estimated_payment: parsed.q3_estimated_payment,
        f2210_q4_estimated_payment: parsed.q4_estimated_payment,
        f2210_prior_year_tax: parsed.prior_year_tax,
        f2210_prior_year_agi: parsed.prior_year_agi,
      })],
    };
  }
}

export const f2210 = new F2210Node();
