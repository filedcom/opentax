import { z } from "zod";
import type {
  AtLeastOne,
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { computeRegularMethodPenalty } from "./calculation.ts";

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
  // Annualized income installment method elected
  annualized_method: z.boolean().optional(),
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
    if (parsed.waiver_requested === true) return { outputs: [] };
    if (parsed.underpayment_penalty !== undefined) {
      if (parsed.underpayment_penalty === 0) return { outputs: [] };
      return {
        outputs: [output(f1040, {
          line38_underpayment_penalty: parsed.underpayment_penalty,
        })],
      };
    }
    if (parsed.annualized_method === true) return { outputs: [] };

    if (parsed.current_year_tax !== undefined) {
      const penalty = computePenalty(parsed);
      if (penalty === 0) return { outputs: [] };
      return {
        outputs: [output(f1040, { line38_underpayment_penalty: penalty })],
      };
    }

    const fields: Record<string, number | boolean> = { f2210_active: true };
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) fields[`f2210_${key}`] = value;
    }
    const outputs: NodeOutput[] = [
      output(
        f1040,
        fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ),
    ];

    return { outputs };
  }
}

export const f2210 = new F2210Node();
