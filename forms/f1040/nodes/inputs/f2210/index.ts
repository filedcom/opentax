import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 safe harbor thresholds (IRC §6654)
const SAFE_HARBOR_CURRENT_YEAR_PCT = 0.90;   // 90% of current year tax
const SAFE_HARBOR_PRIOR_YEAR_PCT = 1.00;      // 100% of prior year tax
// 110% rule applies when prior-year AGI > $150,000 (or $75,000 MFS)
const HIGH_INCOME_AGI_THRESHOLD = 150000;
const HIGH_INCOME_PRIOR_YEAR_PCT = 1.10;      // 110% of prior year tax

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

function totalEstimatedPayments(input: F2210Input): number {
  return (input.q1_estimated_payment ?? 0) +
    (input.q2_estimated_payment ?? 0) +
    (input.q3_estimated_payment ?? 0) +
    (input.q4_estimated_payment ?? 0);
}

function totalPayments(input: F2210Input): number {
  return (input.withholding ?? 0) + totalEstimatedPayments(input);
}

// Minimum required payment per safe harbor rules
function safeHarborAmount(input: F2210Input): number {
  const currentYear90 = (input.current_year_tax ?? 0) * SAFE_HARBOR_CURRENT_YEAR_PCT;
  const priorYearAgi = input.prior_year_agi ?? 0;
  const priorYearPct = priorYearAgi > HIGH_INCOME_AGI_THRESHOLD
    ? HIGH_INCOME_PRIOR_YEAR_PCT
    : SAFE_HARBOR_PRIOR_YEAR_PCT;
  const priorYearThreshold = (input.prior_year_tax ?? 0) * priorYearPct;
  return Math.min(currentYear90, priorYearThreshold);
}

function hasSafeHarbor(input: F2210Input): boolean {
  if (input.waiver_requested === true) return true;
  const payments = totalPayments(input);
  return payments >= safeHarborAmount(input);
}

function computePenalty(input: F2210Input): number {
  // Waiver requested — no penalty regardless of other fields
  if (input.waiver_requested === true) return 0;
  // If a pre-computed penalty is provided, use it directly
  if (input.underpayment_penalty !== undefined) {
    return input.underpayment_penalty;
  }
  // If safe harbor met, no penalty
  if (hasSafeHarbor(input)) return 0;
  // Without full 2210 calculation, no penalty computed here
  return 0;
}

class F2210Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2210";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const penalty = computePenalty(parsed);

    if (penalty === 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      output(f1040, { line38_underpayment_penalty: penalty }),
    ];

    return { outputs };
  }
}

export const f2210 = new F2210Node();
